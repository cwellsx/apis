# Electron app

The primary interface: an Electron main process and a React renderer, both in front of the headless backend.
What the app shares with that backend -- the contracts, and how they are linked -- is `INTERFACES.md`.

## [shared.ts](../../packages/electron-app/src/shared.ts)

`main` and `renderer` are one package, so the boundary between them is not an interface between packages: it
is this app's own, and it lives in `src/shared.ts`.

Two types, one in each direction:

- **`MainApi`** -- `onEvent(events)`: the renderer tells main what the user did.
- **`RendererApi`** -- `show(views)`: main hands back what to draw.

`src/preload.ts` is the only thing that bridges them. It builds the `MainApi` the renderer sees, over
`ipcRenderer`, and takes the `RendererApi` the renderer implements. Main then applies the events through the
backend's `PresenterApi`, which returns the views that `RendererApi.show` carries back. See `DATA-FLOW.md` for that
round trip.

## [main/](../../packages/electron-app/src/main/)

`src/main` has no subfolders, and little to describe: it is Electron boilerplate -- the window, the menu, the
lifecycle -- plus the work of instantiating the backend and connecting it through to the renderer.
`createApplication` starts it, `createOpen` opens a data source, `onEvents` and `show` carry the two
directions of the IPC, and `menu` builds the application menu from the items the backend supplies.

What it owns that the backend cannot is the **paths** -- the database file, the native binding, `Core.exe` --
which it hands over through `setPaths`. See `INTERFACES.md`.

## [renderer/](../../packages/electron-app/src/renderer/)

`src/renderer` is where the interface lives, and it has room to grow into a document of its own. `App.tsx`
holds the state and the `RendererApi` implementation, `Layout.tsx` arranges the panels, and `components/` and
`elements/` hold what the pieces share. `useKeyboard.ts` and `useZoomPercent.ts` are the app's own behaviour
rather than the backend's, and `TextView.tsx` renders the text views -- the menu and the options arriving as
views rather than as messages of their own.

### [graphs/](../../packages/electron-app/src/renderer/graphs/)

`Graph.tsx` draws the SVG the backend rendered, and `EdgePopup.tsx` is the popup over it. The SVG is injected
**inline** rather than referenced as an image, so CSS `:hover` applies to it -- which is what lets the popup
appear without a round trip: everything it needs is already in the document.

**Hover is local; only clicks go back to the backend.** Mouse-move fires far too often to ask about each one,
so popup data arrives with the render that produced the SVG. That is also why the graph is expected to stay
small.

### [nodes/](../../packages/electron-app/src/renderer/nodes/)

`TreeView.tsx` and `Nodes.tsx` draw the node tree beside the graph, over the same node state: expanding a node
in one is expanding it in the other.

### [configuration/](../../packages/electron-app/src/renderer/configuration/)

Renders the options panel from the schema the backend supplies.

### [details/](../../packages/electron-app/src/renderer/details/)

Renders what is known about the selected assembly, method or custom node.

## Related

- `../ui/README.md` -- how the interface looks and behaves.
- `../ui/INSPECTOR.md` -- the popup in detail.

