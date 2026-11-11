# Gestures

Every gesture, on every surface, and the result it produces. [README.md](./README.md) has the invariants
these obey and the prerequisites they assume.

**Status** is one of: _built_ — implemented; _partial_ — implemented in the backend but not reachable;
_planned_ — agreed, not implemented.

## Graph — hover

| Gesture                                                            | Result                                                                                                                                                                                 | Status  |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Hover an **edge**                                                  | Edge popup: the header is the edge's two nodes, with an icon per node type; one row below per pair of the edge's bundle, one level down. An edge with no pairs shows the header alone. | built   |
| Hover a **group** — a node which can be open or closed             | Node popup: the header is the node's full label, its type icon and its child count; one row per child, with an icon per type. Anchored to the node, not to the cursor.                 | planned |
| Hover a **leaf** — a method, or an assembly in the references view | Node popup: the same header; one row per call into and out of the node, with full names and a direction. A leaf's calls are the analogue of a group's children.                        | planned |
| Hover empty space                                                  | Nothing.                                                                                                                                                                               | built   |
| Hold **Shift** or **Ctrl** while a popup is shown                  | The popup is **frozen**: it stops following the cursor and stops changing, so the mouse can travel into it. Releasing resumes following.                                               | built   |
| Use the **pin** control in a popup's header                        | The same, without holding a modifier. Needed to tick checkboxes comfortably.                                                                                                           | planned |
| Move the mouse from the graph into the popup                       | The popup stays only while frozen or pinned; otherwise leaving the graph closes it.                                                                                                    | built   |

Hover never round-trips: everything above arrives preloaded with the image, keyed by node or edge id.

**Caps.** A popup shows at most a fixed number of rows — of the order of 20 — followed by a row saying how
many are not shown, alongside the total. A namespace or a generated type can hold hundreds of children, so
an uncapped list is unreadable and an uncapped payload unbounded.

**Closing.** A popup closes when the mouse leaves the graph, unless frozen or pinned, and when the element
it describes leaves the graph — which is what a state change that hides it does.

## Graph — click

| Gesture                                                | Result                                                                                                              | Status                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Click a **node which can be open or closed**           | Toggle it: a closed node opens, an open node closes. One round trip, then the graph is re-rendered.                 | partial — `createPresenter` already does this, but the click never arrives |
| Click an **open node's cluster** — its border or label | The same as clicking the node, because an open node is emitted as a cluster rather than as a node.                  | planned                                                                    |
| Click a **leaf**                                       | Show its details. It currently raises instead of doing nothing, which is acceptable while the feature is developed. | planned                                                                    |
| Click an **edge**                                      | Show the edge's details. Not implemented, likewise.                                                                 | planned                                                                    |
| Click the **background**                               | Nothing.                                                                                                            | built                                                                      |
| **Double-click**                                       | Not used, deliberately.                                                                                             | —                                                                          |

**Cursors** are the affordance which makes the click discoverable:

| Element                     | Cursor                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| closed node                 | `zoom-in`                                                                                                       |
| open node                   | `zoom-out`                                                                                                      |
| leaf                        | `default`, or `help` once there are details to show                                                             |
| edge                        | `default`                                                                                                       |
| while Shift or Ctrl is held | the same, with the modifier's own cursor — the custom cursors the previous design used are still in `Graph.css` |

Hovering already highlights: the style injected into the SVG strokes a hovered node's shape and a hovered
edge's path in red. It also strokes the hit areas in blue for development, which should go.

## Graph — right-click

Planned. The context menu carries the actions which do not deserve a primary gesture, and is the
discoverable alternative to a hover toolbar:

| Item                              | Result                                                  |
| --------------------------------- | ------------------------------------------------------- |
| Hide                              | Hide the node, and with it its subtree.                 |
| Show                              | Restore a hidden node. Offered only where hidden.       |
| Expand subtree / Collapse subtree | Open or close every node below this one.                |
| Peek                              | Show the node's children in a popup without opening it. |
| Details                           | Show the node in the inspector.                         |

## Tree — existing gestures

| Gesture                | Result                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Click the **chevron**  | Open or close the node — in the tree, and therefore on the graph.                                                 |
| Click the **checkbox** | Show or hide the node. Tri-state: a node whose children differ from it is mixed.                                  |
| —                      | A hidden node stays listed, unchecked. **This is the restore path**, and it is why hiding needs no graph gesture. |

Planned: a visible count of hidden nodes with a single "show all", because the global restore currently
exists only as `Reset` in the View menu.

## Popups — position, freeze, pin

- An **edge** popup follows the cursor. An edge has no small rectangle to anchor to — its path spans the
  graph — so the pointer is the only sensible anchor.
- A **node** popup anchors to the node's rectangle, so it never covers the node it describes.
- The popup is never unmounted, and is positioned by writing `transform`, so following the cursor re-renders
  nothing.
- **Freeze** is a held modifier; **pin** is a toggle in the popup. Both need `pointer-events: auto` on the
  popup, and pin additionally needs the graph to stop recomputing the hover while a popup is pinned.

## Popups — checkboxes, and batched commit

Planned, and the reason the pin exists. Ticking a checkbox in a popup does not apply immediately:

| Step                                | Result                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Tick a child                        | The tick is shown in the popup and remembered as a pending state change. Nothing else changes.          |
| Tick more children                  | Each is added to the same pending set.                                                                  |
| Close the popup, or press **Apply** | The pending changes are sent as **one** `FilterEvent` — one array, one round trip, one GraphViz render. |
| Press **Escape**                    | The pending changes are discarded.                                                                      |

Deferring matters for two reasons. Each applied change re-renders the whole graph through GraphViz, so
fifteen ticks would otherwise mean fifteen renders; and an immediate apply would re-render the graph under
the popup, moving the very node the popup is about.

The same batching is worth reusing in the tree, where each tick is currently its own round trip — and where
a tick which arrives while the app is busy is dropped, with a beep, rather than queued.

## Edge cases

- Clicking anywhere inside an open node hits the innermost element which has an id: the child node, not the
  cluster around it.
- Clicking the graph background lands on GraphViz's root group, which is neither a node nor an edge, and
  does nothing.
- When a state change removes the hovered element from the graph, its popup closes rather than describing
  something which is no longer there.
