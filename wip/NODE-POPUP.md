# The node popup

New feature -- hover popup for a node.

This is like the existing edge popup: same interaction, same place.

Data is preloaded in the backend, in the getGraphNodes function, which also creates the EdgePopups data.

## The data type

New NodePopups type is a Map with

- nodeId as the string key
- a new NodeInfo as the value type by analogy with EdgeInfo

Rename edgePopup.ts to popup.ts and add NodePopups to this so it can share the definition of types like Label.

## The cases, and where the data comes from

The popup's content depends on what the node is drawn as.

| case       | drawn as      | left column  | right column                                                      | source                                   |
| ---------- | ------------- | ------------ | ----------------------------------------------------------------- | ---------------------------------------- |
| **leaf**   | a node        | empty        | its edges' remote endpoints, plus calls to and from open clusters | `calls` + `parentNodeCalls`              |
| **closed** | a node        | its children | its edges' remote endpoints, plus calls to and from open clusters | `calls` + `parentNodeCalls`              |
| **open**   | a **cluster** | its children | what its edges _would_ be                                         | `calls`, widened to include parent nodes |

## Map's keys are the nodes on the graph

The nodes on the graph are found in forest.allNodes.

- Iterate this collection and create NodeInfo for each visible node in this collection.
- To create NodeInfo you will need "its children" and "remote endpoints" per the table above.

These are Node instance whose children element is references to its children.

So for "open" nodes you can find "its children" in this way.

## Child nodes

### Leaf nodes

n/a (empty)

### Opened cluster

For an open cluster see the "children" element -- which already exists in an open Node instance --
simply copy this from the node's "children" into its NodeInfo.

### Closed node -- new!

For a closed cluster the children aren't being currently selected from SQL.

The method which does currently select nodes is `toMethodForest`

- This uses its `isExpandedId` to select which nodes to fetch the children of
- All selected data are then passed into `addToParent`

Instead

- Add `closedChildren: Map<string, Label[]>` to the `DotnetForest` type
- Don't use `IsExpanded` to limit which nodes are included in `selectWhereIn`
- Use `IsExpanded` afterwards on each selected child
  - Either pass is to `addToParent` as previously
  - Or if it's the child of a parent which isn't expanded, save it into the new `closedChildren` map instead

The new `closedChildren` is eventually used to populate the NodeInfo of closed nodes.

## Node calls

### Leaf nodes and Closed nodes

The calls for these nodes -- to other visible leaf and closed nodes on the graph -- are already displayed.

But not currently displayed are calls to open cluster

These extra calls are useful for example:

- A node might call 20 methods in 2 assemblies
- Knowing those 2 assemblies would provide a way to group the 20 methods into 2
- Displaying the parent of a method somewhere is essential to avoid displaying the method's very long full-name

So the NodeInfo of Leaf and Closed nodes needs to display calls to open clusters -- which aren't currently selected from SQL.

### Open clusters

Similarly the NodeInfo of Open clusters needs to display calls to all other visible nodes -- Open, Closed, and Leaf -- which aren't currently selected.

### How to select extra calls

Instead of an extra, new SQL select of calls, per node for each NodeInfo, do the same kind of things as was done to select extra nodes --
i.e. change the existing query to expand its scope, and a new pass in the application function over its results to filter its newer larger result set.

The current method in question is `getCalls`.

This selects ids into `allLeafs` where ids are

- In the `forest` (i.e. the list of nodes)
- And `isVisible` (i.e. on the graph and not just in the node tree)
- And `!isParent`

My expectation is that the following changes would do it.

- Change the return type to add a new `Map` (like the `closedChildren` map was added to `DotnetForest`)

  `{ nodeCalls: NodeCall[]; parentNodeCalls: Map<string, NodeCall[]> }`

- Keep the `isVisible` filter but remove `!isParent`

=> this selects all calls including those to and from parent nodes

- Then filter the resulting `calls`

  If either or both endpoints is a parent node, remove the call from `calls` (before it is passed to
  `remapCalls`) and add it to `parentNodeCalls` — **always keyed by both endpoints**, so that any node can find
  the calls it has to or from a parent.

### remapCalls

NodeInfo should display all calls to any and all visible nodes only.

A NodeInfo's calls are the visible calls touching the node, **plus the `parentNodeCalls` entries under the node's
own key** — those are the calls to and from parent nodes, which have no edge to carry them.

`remapCalls` applies to `calls` only. Parent calls are removed before it runs, so they cannot affect edge popups;
and a parent call whose other endpoint is a hidden id is keyed under that hidden id, which no NodeInfo reads — so
it never surfaces.

## UI design decisions

- **Hover**, on mouse-move while over. Click already means expand/collapse; right-click is reserved for a context
  menu that does not exist yet. The open cluster's box is hoverable — its border already changes colour.
- **Preloaded**, like edges, and carried in the same image data. Mouse-move is far too frequent to query.
- **In the graph**, not in a panel.
- **One popup at a time.** Over both a node and an edge, prefer the edge: an edge is a thin target and easy to
  miss.
- **Follow the mouse**, as the edge popup does. Fixing it to the right of the node is a refinement for later.
- **A leaf's popup is shown**, not suppressed.
- **Cluster boxes have NodeInfo**, it is `<g class="cluster collapsible" id="…">`, so it carries an
  id and the `collapsible` class — the same two things a node has. `closest("[id]")` finds it and
  `getClickableNodeId` maps it to a node id already, so stage 3 is the same code as the node case rather than a
  special one.
- **Direction of a call in both directions** — for now this can be shown as two uni-directional rows, no `both` marker.

## NodeInfo contract

A sibling of `EdgeInfo`/`EdgePopups`, keyed by node id:

```ts
type NodeCallRow = { label: string; nodeId: NodeId; type: AnyNodeType; direction: "right" | "left" };
type NodeInfo = {
  node: { label: string; nodeId: NodeId; type: AnyNodeType }; // the header
  children: Label[]; // the left column
  calls: NodeCallRow[]; // the right column
};
```

`Label` is the edge popup's `{ label, nodeId, type }`, so the children rows are the same shape. **Children sorted by
type, then name.** One arrow per direction — a call in both directions becomes two uni-directional rows, so there
is no `both` marker. **Calls sorted by direction, then by node type, then by name.** As with edges, the sort
belongs to the model so every front end shows the same order.

## What the code says

From reading `toMethodForest`, `makeNodes`, `createDotnetViewState`, `getCalls` and the contracts:

- **The selection is already by assembly.** `toMethodForest` selects namespaces and types with
  `selectWhereIn("assemblyId", assemblyIds)`, and methods with `selectWhereIn("typeId", typeIds)`. The
  `isExpandedId` filtering is in **code**, not SQL — three filter points:
  - namespaces: inside `clusterNamespaces`
  - types: `namespaceNodes.has(namespaceId) && isExpandedId(namespaceId)`
  - methods: only `isExpandedId` types' ids are in `typeIds`
- **So the change is dropping code filters, not changing queries.** Same outcome as the plan says; the
  implementation lives at those three filter points.
- **The widening is bounded by visibility, not by assembly.** Methods are keyed on the selected types' ids, and
  the type filter keeps only types whose namespace is a visible node. So an assembly with many invisible types
  contributes nothing: the extra fetch is the **visible closed types' methods**. The "sane number of visible
  nodes" safety net is what this rests on, and it is worth measuring rather than assuming (see the Later stage).
- **The combining seam is `createDotnetViewState.getGraphNodes`.** `edgePopups` is built there, in a loop over
  `calls`; `nodePopups` is a sibling loop in the same function, combining `calls`, `parentNodeCalls` and
  `closedChildren`. `getNode` and `findNode` already exist.
- **Hidden and expanded are orthogonal.** `hiddenIn` comes from clustered namespaces only, and only when the
  containing node is visible. A hidden-but-expanded node exists for the checkbox tree, not for the graph. So
  `closedChildren` keys on `collapsible: "collapsed"` regardless of `isVisible`.

## Stages

### Unit tests

Improve the unit-tests to capture the data whose implementation we're about to change (by changing how data is selected)

- List of calls
- Edge popups
- Content of forest and visible nodes

Requirement is to capture this data, for repeatable sample view state --
in a format (names not tokens), and a location (version-controlled in the apis repo),
that can be regression-tested.

Invoked from `test-dotnet-view`, which is what we run frequently. Written to a new folder in the repository —
`./test` or a canonical name if one exists. Deliberately selective: one interesting view state rather than many,
so the data is reviewable and the diff stays small.

### Backend

- Change two existing methods to return new `parentNodeCalls` and `closedChildren` data
- Use these together with existing `Node.children` to build a new Map of `NodeInfo`

### Frontend

- New `NodePopup.tsx` -- modelled on `EdgePopup.tsx`: header, divider, two columns; positioned as the edge popup is.
- Hover wiring -- `findHoveredNode` beside `findHoveredEdge` in `Graph.tsx`, the one-at-a-time rule, and
  the cluster box as a hover target. The existing modifier-key freeze should extend unchanged.

### Later

A previous version of the plan said this

— the position refinement -- once there is something worth positioning: fixed to the right of the node, since a
node has a known shape in a way an edge does not.

— measure -- the preload grows from edges × labels to nodes × (children + calls). `CONSTRAINTS.md`'s
small-graph assumption gets tighter, and by how much is worth knowing rather than assuming.

The first is true, perhaps the second isn't -- because by only widening the existing SQL select
I hope that the increase is not pathological.
