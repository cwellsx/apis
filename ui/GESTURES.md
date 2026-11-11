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

## Clickability

Nothing in the graph changes the pointer: no non-standard cursors, no `pointer`, and the browser's text
cursor over the labels is suppressed as well, so the pointer is always the plain arrow. The previous design's
data-URI cursors were an early attempt and have been deleted, along with the dead `<area>` rules they lived
in. Instead, hovering colours an element to say what a click would do.

| Hovered element                    | Colour | Meaning                        |
| ---------------------------------- | ------ | ------------------------------ |
| a node which can be open or closed | green  | clicking it opens or closes it |
| an edge, or a leaf node            | red    | clicking it does nothing yet   |

Every node and edge is coloured on hover, so the graph says what a click would do before it is made. Green
means the click acts; red means it does not. The assignment is provisional — edges and leaves are _meant_ to
become clickable, for their details, and will turn green when they do — so the rule is stable while the
assignment is not.

The colours belong in the style `insertSvgMap` injects into the SVG, which already strokes a hovered node
and a hovered edge, and which also strokes the edge hit areas blue for development: that debug stroke should
go. Colour is the only channel, so a second one — a dashed stroke, say — belongs in the same style if colour
alone proves too subtle.

Two things about that style are not obvious, and both are needed for the hover to work at all. A node's box
is normally **unfilled**, and an unpainted interior is not hit-tested, so the style makes the box a target
whether it is painted or not — without that, hovering inside a node hits whatever is behind it, which is
usually the box of the node it is inside. And the stroke is **widened** while hovered, because a hairline of
colour is too easily read as the node's own black border. Both can be seen at work in
[example-calls.svg](./example-calls.svg).

## Graph — hover widget (deferred)

Not needed yet: the existing gestures cover every action, so this is recorded rather than built. It is the
inline home of the actions which do not deserve a primary gesture, and it borrows the window-control
metaphor, which is about the most widely understood set of glyphs there is.

| Glyph | Window meaning | Node meaning                                   |
| ----- | -------------- | ---------------------------------------------- |
| `—`   | minimize       | collapse — offered only while the node is open |
| `□`   | maximize       | expand — offered only while the node is closed |
| `X`   | close          | hide, and conventionally red on hover          |
| `…`   | more actions   | details, peek, expand or collapse subtree      |

Minimize and maximize are one button, not two: like a window, it shows the action it will perform, so the
glyph also reports whether the node is open. A leaf has nothing to open, so its row is `…` and `X` only.

**Placement.** The row straddles the node's top border at its right-hand end, half inside and half out. That
fits because GraphViz's default node is 0.5in tall and 0.75in wide and the DOT does not override it: every
box is about 48px tall whatever its label, with the label centred, so the space above and below the label is
clear. Edges attach at the middle of a node's top and bottom sides, so the top-right corner is free of them;
the one thing to watch is a self-loop, which bulges to the right of its node.

**Reaching it.** The row appears after a short dwell — of the order of 150ms, as VS Code does for its inline
hover actions — so that sweeping the pointer across the graph does not flash rows everywhere. The glyphs are
small, so their hit areas are padded, the way the edge hit areas already are. The row persists while the
pointer is over the node, the popup or the widget itself, so no modifier is needed to reach it.

**Not on edges.** An edge is a path with no rectangle to anchor to, so a widget on an edge would have to
follow the cursor — the one form of this which would be genuinely intrusive. Edges keep the popup and the
context menu.

It would be a renderer overlay anchored to the node's rectangle, the same mechanism as the popup, so it
needs no backend change. Generating it into the SVG instead — GraphViz HTML-like labels with the space
reserved so nothing shifts — is possible, but it would widen every node on an already dense graph. The icons
are standard ones from the libraries already vendored, copied in on demand.

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
