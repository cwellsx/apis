# View state

How the backend turns the data into a view: the forest of nodes, the state each node carries, the clustering
that hides some of them inside others, and the popup that explains an edge. There are two kinds of view,
**calls** and **references**, and all but the last chapter here describes the calls view.

## The forest

A view is built as a forest: a trunk of groups and assemblies, and beneath it whatever is expanded. A node's
children are added as it is expanded, so the forest contains every node the view knows about, each marked
visible or not, rather than only the visible ones.

The **leaves** are the nodes that are visible and have nothing visible below them. They matter because the
edges are drawn between them: a call is an edge when both of its endpoints are leaves, or when both are
hidden inside nodes that are — see the clustering below.

A namespace that is alone in the first layer of its assembly is expanded by default, so that an assembly
reveals what is inside it rather than a single closed node. It is still an ordinary namespace: it can be
collapsed, and that is stored like any other state.

## Node state

Two things are stored per node, per view: whether it is hidden, and whether it is expanded. Both live in
SQLite, keyed by the view, so a view is restored as it was left.

**State is inherited when it is absent.** A node with no stored state takes its parent's visibility, which is
what makes hiding a node hide everything below it without writing a row for each descendant. A node that has
been given a state of its own keeps it, which is what makes a partly-hidden subtree possible.

**Setting a node's visibility clears the stored state of everything below it**, so that the subtree follows
the node rather than each descendant keeping an opinion. That includes the nodes clustered into it, which are
below it in the view but not in the ancestors table — the view clears those itself, for that reason.

## Clustering

Two options, `clusterNamespaces` and `clusterTypes`, make a namespace or a type a node *inside* the one which
declares it rather than a node in its own right. With namespaces clustered, `Foo.Bar.Baz` sits inside
`Foo.Bar` and is not a node at all unless that is expanded; with types clustered, a nested type sits inside
the type that declares it.

The tree is walked in the backend rather than in SQL, because its depth is not known in advance — how deep a
cluster goes depends on what is expanded, not on the data.

**A cluster's calls are the calls of the node it is clustered into.** `remapCalls` rewrites each endpoint that
is hidden to the node it is hidden in, which is what keeps the edges of a collapsed cluster complete rather
than losing the calls that pass through it.

## The popup

An edge is drawn between two nodes, but it stands for every call beneath them: it is a bundle. The popup is
what explains the bundle, and `getEdgeLabels` shows **the layer directly below** the edge's endpoints — an
assembly-level edge shows the calls between its namespaces, a namespace-level edge those between its types, a
type-level edge those between its methods.

Which layer that is, is decided by the *kind* of each endpoint rather than by the result of a query. A node
whose kind has nothing below it — a method, in the calls view — is looked up at the node itself, and the
`parents` table is not consulted for that side. A call from a leaf to a leaf therefore has no popup content at
all, and returns before any query is built; the remaining three cases are written out as three queries rather
than assembled from fragments.

The `parents` table lists every node's direct children together with the kind of link each one is, and is
derived from `ancestors`, so the two cannot disagree about which links are direct. A `kind` mask on it is what
lets one popup query serve both branches of the clustering option: direct children only, or the clustered
namespaces and types as well.

## The references view

The references view draws references rather than calls, so neither a popup nor a level below applies to it: its
leaf is an assembly, and an edge between two assemblies has nothing beneath it either. Which kind a view is, is
`ViewType` — `"calls" | "references"` — and the model carries one row per view it offers.

## Related

- `../ui/INSPECTOR.md` — how the popup is presented.
- `DATA-FLOW.md` — where the data comes from, and what the roll-up guarantees.
- `INTERFACES.md` — the contracts this sits in, and the layering behind them.

