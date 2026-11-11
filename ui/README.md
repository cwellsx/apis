# UI design

How the API Viewer's user interface is meant to work, and why: the surfaces it presents, the invariants
they obey, and the gestures that connect them.

This is **design** documentation, not user documentation. It describes behaviour and the reasoning behind
it, for whoever implements or changes the UI. User documentation — features, screenshots — is a later item
in [ROADMAP.md](../ROADMAP.md). The design conversations these decisions came from are archived, as drafts,
in [MORE/](../MORE).

Most of what is described here is not implemented yet. Each section says what already exists and what has
to change to make it so.

| Document                       | Contents                                                     |
| ------------------------------ | ------------------------------------------------------------ |
| [GESTURES.md](./GESTURES.md)   | Every gesture, on every surface, and the result it produces. |
| [INSPECTOR.md](./INSPECTOR.md) | The deferred details pane, and what details exist per node.  |

## Example files

`example-calls.dot`, `example-calls.svg` and `example-calls.txt` are one view of the tool's own source. The
test which prints the view state (`npm run test-dotnet-view -w backend-test`) writes them and then copies
them here, so running it is also how they are regenerated.

They are the **initial state of the calls view** of the Core2 test data — a graph with both open and closed
nodes, small enough to read end to end.

| File                | Contents                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `example-calls.dot` | what the model is turned into, before GraphViz lays it out: the clusters, the nodes, and the attributes which carry the node classes |
| `example-calls.svg` | what GraphViz returned, after `insertSvgMap` post-processed it — the injected style, the hit areas and the classes are all in here   |
| `example-calls.txt` | the node tree the popups and the left-hand tree are built from, as `printForest` prints it                                           |

They are a **snapshot**, replaced whenever the printer is run, and not kept in step with the code in between:
GraphViz coordinates shift on almost any change, so a diff here is expected rather than alarming. Read them
for the shape of the data, not as a promise about the current output.

## Surfaces

**Graph** — the SVG in the Graph tab, and the primary surface. It is not React: GraphViz generates the SVG
and it is injected into the DOM, so interaction is by event delegation over the groups GraphViz emits —
`<g class="node">`, `<g class="edge">`, `<g class="cluster">` — each carrying the node or edge id.
GraphViz's own `class` is what identifies an element; extra classes may be added alongside it.

**Tree** — the Explorer tab. The precise control surface: it mirrors the graph's expansion, it shows and
hides nodes, and it is the only place a hidden node remains reachable.

**Popups** — transient, read-only read-outs of what is _inside_ a hovered graph element: the bundle of a
hovered edge, the children of a hovered node, the calls of a hovered leaf.

**Context menu** — proposed. The discoverable home of the actions which do not deserve a primary gesture:
hide, subtree operations, details.

**Inspector** — deferred. The persistent surface for details, including a method's source.

**Hover widget** — deferred. The inline home of the actions which do not deserve a primary gesture: hide,
peek, details. [GESTURES.md](./GESTURES.md) records the design and the geometry which makes it fit.

## Invariants

1. **Hover is local.** Everything a popup shows arrives preloaded with the image. No hover ever
   round-trips: the presenter handles one event at a time and the app refuses input while busy, so a fetch
   on hover would lag and beep.
2. **State changes round-trip, and are batched where possible.** Expanding, collapsing, showing and hiding
   are all `filter` events, and `FilterEvent` is already an array — so many changes can be applied by one
   round trip, which matters because each applied change re-renders the graph through GraphViz.
3. **A click on the graph means one thing: the structural action.** Opening and closing is what a node
   click does. Filtering belongs to the tree; details belong to the inspector.
4. **Restoring a hidden node is never a graph gesture.** A hidden node is not on the graph. The tree keeps
   it, unchecked, and there is a global restore.
5. **The graph abbreviates; everything else is complete.** A rendered node label is shortened against its
   parent (`(*)Foo`), so popups and the tree are where full names are read.
6. **Structure and presentation stay separate.** The backend sends data — the SVG, plus preloaded maps
   keyed by node and edge id — and the renderer decides how it looks.
7. **One level at a time.** A popup shows one level below its subject: an edge's bundled calls, a node's
   children, a leaf's calls. That is the granularity of the expansion model, and it keeps the payload
   proportional to what is on the graph.
8. **What a click does is visible before the click.** Hovering colours a graph element: green if a click
   acts on it, red if it does not. Nothing changes the pointer, so colour carries the whole signal — and
   the graph is the only surface which needs it, because the tree's affordances are already labelled.

## State and data rules

- `NodeState` is `{ isHidden }` or `{ isExpanded }`. The tree already sends both, and the backend's
  `makeSetNodeState` applies them.
- Visibility is inherited: a child is visible if its parent is, unless it has its own state. Hiding a child
  marks every ancestor `isMixed`, which is what the tree's tri-state checkbox displays.
- A **closed** node carries no children — `makeNodes` skips the children of a closed parent, so `Closed`
  has no `children` field. Popup data for closed nodes therefore comes from SQL, not from the tree.
- A hidden node stays in the tree, because the tree is built from the same roots the DOT is generated
  from, before DOT filters the invisible ones out.
- Preloaded popup data rides with the image, the way `edgePopups` does, so it can never disagree with the
  layout it was rendered for.

## Non-goals, for now

- **Hover widgets and toolbars, for now.** The geometry works — a GraphViz node has room in its top-right
  corner — but the existing gestures already cover the actions, so it stays a recorded design rather than a
  built one. See [GESTURES.md](./GESTURES.md).
- **Double-click gestures.** Slow, and disliked in every graph tool which has tried them.
- **Keyboard navigation on the graph.** The tree is the accessible path to the same state.
- **Source file and line.** Not in the model; it needs Core to emit it, and it belongs with the VS Code
  round-trip work.

## Prerequisites

The gestures assume these are done first. They are small and independent.

1. **Clicks actually reach the backend.** `Graph.tsx` reads `element.className`, which for an element in
   the SVG namespace is an `SVGAnimatedString` rather than the string `Element.className` is declared to
   be, so no click is ever sent. Read the `class` attribute instead — `toGraphElement` already does, and
   already tolerates whatever extra classes GraphViz is given.
2. **Clusters count as nodes.** An open node is emitted as `<g id="<nodeId>" class="cluster">`, so a click
   on its border or its label has to map to the same node id as a click on a closed one. The current
   mapping accepts only `edge` and `node`.
3. **The dead cursor rules go.** `Graph.css` still selects the obsolete `<area>` elements and carries two
   data-URI cursors, which exist only as a workaround for an electron-forge asset-loading bug that custom
   image cursors hit. Nothing changes the pointer any more, so all of it can be deleted — and with it the
   need for the DOT to write a class for the collapsible state.
4. **Popups can be entered.** `EdgePopup.css` sets `pointer-events: none`, with a comment saying it has to
   become `auto` once the popup is interactive — which the freeze-on-modifier-key behaviour makes possible.

## Open items

- A **pin** control in the popup header, so a popup can be entered without holding a modifier.
- **Deferred commit** for popup checkboxes: tick several, apply once, discard with Escape.
