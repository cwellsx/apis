# Ancestors kind bits — plan for review

Deferred: option B is the chosen first move, and the precondition is capturing the current behaviour as
regression tests before any of it starts. No source has changed for this plan — the `kinds` mask on
`sqlCommon`'s `setIsVisible`, prototyped for it, has been reverted, so every query is as it was.

## Goal

The `ancestors` table carries the kind of every relationship, so that the popup and a change of
visibility both find everything the view treats as _inside_ a node — without the view walking the
tree, and without the second `parents` table.

## The bits

| #   | value | name               | meaning                                                            |
| --- | ----- | ------------------ | ------------------------------------------------------------------ |
| 1   | 1     | Direct             | the descendent is one level down; clear = further down             |
| 2   | 2     | Structural         | the real tree: assembly > namespace > type > method                |
| 3   | 4     | ClusteredNamespace | nearest clustered hop is a namespace declaring another in its name |
| 4   | 8     | ClusteredType      | nearest clustered hop is a type declaring a type                   |

Exactly one of bits 2–4 is set — `check: "kind & 14 <> 0"`. Bit 1 is orthogonal: it is what
separates "my parent" from "an ancestor of mine", and it is the reason the popup needs no depth.

| kind | reads as                                                           |
| ---- | ------------------------------------------------------------------ |
| 3    | direct structural — a namespace's types, a type's methods          |
| 2    | further structural — a namespace's methods, an assembly's types    |
| 5    | direct clustered namespace — a namespace's declaring namespace     |
| 4    | further clustered namespace — a type in a namespace clustered away |
| 9    | direct clustered type — a nested type's declaring type             |
| 8    | further clustered type — a nested type's members                   |

On a non-`Direct` row the kind is the **nearest** hop, not the first: the nearest hop is what the popup
shows as the parent, and with an all-bits mask the choice does not matter to deletion.

## The risk to settle first: two ancestries that must agree

The closure is a derived copy of relationships that the structural rows already record. Two copies can
disagree, and a disagreement would be silent — a node whose state is not cleared, or a popup parent that
is not real. So the closure must be derived from **one** description of "who is whose child", and the
test suite must assert the agreement rather than assume it.

## Two ways to get there

**Option A — one children map, one closure.**
Build `children` from the base tables only, then take the transitive closure once:

```
assembly  -> namespace   namespaces.assemblyId                Structural
namespace -> namespace   namespaces.declaringNamespaceId      ClusteredNamespace
namespace -> type        typeNames.namespaceId                Structural
type      -> type        typeNames.declaringTypeId             ClusteredType
type      -> method      methodNames.typeId                   Structural
group     -> assembly    name prefix                          Structural
group     -> group       name prefix                          Structural
```

Closure: for each parent, depth-first over `children`; a child gets `kind | Direct`, anything deeper
keeps the kind of its nearest hop. This _reproduces_ the existing structural rows — including the
`namespace <= method` and `assembly <= type` joins — and adds the clustered ones, from one source.

Worth knowing: this makes the ordering constraints inside `insertAncestors` disappear, because every
row comes from the same map over the same tables. The joins only have to run after their base table is
populated, not after each other.

**Option B — keep the proven joins, add clustered rows only.**
Lower risk, and it keeps your `insertAll` ordering as it is. The cost is that the structural ancestry
and the clustered ancestry are derived by two different mechanisms, which is precisely the parallelism
above; the agreement assertion becomes more important, not less.

My reading: A is the better end state and B is the safer first move. A can be reached from B by
replacing the joins one at a time, each with a row-count assertion.

## Invariants worth asserting at insert time

- No row is its own ancestor (`check: "ancestorId <> descendentId"` already exists).
- Every node has exactly one `Direct` row as a descendent, i.e. one parent.
- Every row has bits 2–4 set, exactly one of them.
- The closure is idempotent: computing it twice over the same database yields the same rows.
- Row count is sane: measure the closure over Core2 before and after; a jump by more than a small
  factor means the walk emits duplicates and `insertMany` is hiding them.

## Tests to write before the schema change

1. **`setIsVisible` clears clustered children.** Expand a namespace, hide a sub-namespace, collapse the
   parent so it clusters, then set the parent visible; assert the child's row is gone from
   `nodeHiddenStates`. This is the behaviour the whole schema change exists to preserve, and it has no
   test today.
2. **Expand then collapse a parent.** Regression for the `namespaceNodes.has(...)` guard.
3. **The agreement assertion**, as a test rather than an `assert`: for every popup parent the view
   reports, the row exists in `ancestors` with the expected bits.
4. Snapshots: expect the popup's output to change wholesale when its source table changes. A regression
   there would be invisible inside that churn, which is why 1–3 come first.

## File-by-file, once the above is settled

1. `sqlCommon/schema.ts` — `AncestorT.kind: bigint`, `zeroAncestor.kind = 0n`, drop the now-unused
   `Boolean, fromBoolean` import (line 6; line 7 re-exports from the module independently).
2. `sqlDotNet/schema.ts` — version 11; `AncestorKind` replacing `ParentKind`; drop `Parent`; drop
   `"parents"` from `tableNames` (103), `DotNetTableRowMap` (124), `row` (180), `newTables` (215–218)
   and the return (241); `check: "kind & 14 <> 0"`.
3. `insertAncestors.ts` — `kind` instead of `isParent` (`Structural | Direct` where `True`,
   `Structural` where `False`), then the closure.
4. `insertAll.ts` — `kind: Structural` at 474; drop `insertParents(tables)` at 482.
5. Delete `insertParents.ts`; `index.ts` exports `AncestorKind`.
6. `createDotnetViewState.ts` — drop `clusteredByVisible`, its fill at 164–165 and the `getOrSet`
   import; pass the kind mask to `setIsVisible`; `getEdgeLabels` reads `ancestors` with the `Direct`
   bit instead of `parents` (the join at ~207–260 is unread and needs one careful pass).

Note on step 6: with the closure in place, a nested type under a clustered namespace has both
`(N → T', 4n)` and `(M → T', 8n)`, so the popup must filter on the `Direct` bit to get _its_ parent.
That is exactly what bit 1 is for, and it is why it cannot be folded into the kind mask.

## Open questions for you

- A or B to start with?
- Does the popup ever want a label the bits cannot express — e.g. "structural but not direct" — or is
  `Direct` plus the kind the whole vocabulary?
- Does anything outside `getEdgeLabels` read `parents` — a test, the VS Code extension? I searched
  `isParent|ParentKind|insertParents|AncestorT` but not `parents` on its own.

---

# Code review

> May I ask you to code review the existing insertAll?
> Do you see a bug in it and/or can you explain what it does, why that's correct?
> It's probably not that complicated if you read it -- just that before creating a second hierarchy, inspect the first.

Reviewed. No bug in the code **as it stands** — but there's a latent trap in it that your planned change would step straight into, and that's the useful part.

## What it does

Three tiers, and every row is written after its inputs exist:

1. **Base** — assemblies, then namespaces (ids by sorted position), then typeNames, members, genericParams, specs, methodNames, signatureTypes, decompiled, calls, fullNames, groups.
2. **Derived from base** — `insertAncestors` (joins the base tables), then the .NET Framework group's rows, inserted directly by `insertAll` rather than by `insertAncestors`.
3. **Derived from derived** — `assertCallsHaveFullNames`, then `insertParents` from `ancestors`.

The tier boundaries are what you were convincing yourself about, and they're right: `insertAncestors` needs methodNames, typeNames, namespaces, assemblies _and_ groups — groups are inserted at 456–457, i.e. before 464, which is the one that would look wrong at a glance.

## Why the multi-pass inside `insertAncestors` is correct

It reads the table it's writing, three times, and the safety comes from two facts:

- **Every later pass is join-restricted to one id brand.** `namespacesJoined` is `ancestors ⋈ typeNames ON ancestors.ancestorId = typeNames.id`, so only rows whose _ancestor_ is a type are picked up. A namespace→method row written one pass earlier has a namespace on the ancestor side and is excluded by brand alone.
- **The pass count is the tree's depth, not recursion.** type→method, then namespace→type (both direct), then namespace→method (joined), then assembly→type, then assembly→method (joined). Five known passes, no walking.

So the whole thing rests on **ids being disjoint across node kinds**. That's the load-bearing invariant, and it's the thing your second hierarchy has to respect.

## The trap for the planned change

New rows would be `(namespace → namespace, 5)` and `(type → type, 9)`. The namespace rows are safe: `namespacesJoined` and `assembliesJoined` join the ancestor side to _type_ and _assembly_ ids, so a namespace ancestor can't match.

The type rows are not. `namespacesJoined` matches a type ancestor — and a `(T → T')` clustered row has exactly that shape. It would emit `(namespace(T) → T')`, and `typeNamespaces` already emitted `(namespace(T') → T')`. After `getNestedNamespaces`, those two namespaces are the same — so the join re-derives an **existing row**, and you get a duplicate `(ancestorId, descendentId)` pair, which is the table's primary key.

Hence: the clustered rows must be inserted **after** the structural joins — which is precisely where `insertParents` sits today (482). The ordering you built has the slot already; the plan just has to use it. And because `insertMany` may silently be an upsert, the guard is a **distinct-pair count**, not an assertion that it didn't throw.

## Smaller findings

- **Dangling `declaringTypeId`.** `getNestedNamespaces` recurses and calls `getOrThrow` on the declaring chain; if the extractor ever omits a type info, the insert throws. And if it survived, `clusterTypes` would silently drop the type from the tree (it's neither a root nor clustered into anything visible). Worth an explicit assert that every `declaringTypeId` is present in `typeNames`.
- **A redundant O(n²).** `values.filter((candidate) => candidate !== value)` copies the whole array per namespace, and `findLongestPrefix` already skips `name === currentLabel`. Dropping the filter makes it one pass over the array, with no change in result.
- **The prefix rule is fine** — I checked, because `Foo` declaring `FooBar` was my first suspicion: `findLongestPrefix` defaults `separator = "."`, and the call omits it, so it matches on segments only.
- **Nested types have two "direct parents".** `typeNamespaces` maps every type with a namespace to its namespace with `isParent: true`, and `getNestedNamespaces` gives nested types their outer type's namespace. So `parents` holds both `(namespace → nestedType)` and `(declaringType → nestedType)`. That's what makes hiding a namespace reach nested types at all — worth keeping, but worth keeping deliberately rather than by accident.

## What I'd assert

Four checks, all cheap, all in `insertAll` after the inserts: ids unique across kinds (the assumption everything rests on); no duplicate ancestor/descendent pairs; every `declaringTypeId` resolves; every `declaringNamespaceId` is in the same assembly and is a shorter prefix. The last two would have caught the dangling case, and the first two would catch the trap above on the day it's introduced.
