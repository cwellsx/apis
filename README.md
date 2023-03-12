# API Viewer

This application browses the APIs of the components in a solution, with the call stacks or dependencies.

## System design

This is an Electron application.

It is based on the `sqlite` branch of https://github.com/cwellsx/electron_forge_template
and includes the following components.

### `src/renderer`

The renderer process implements the UI (using React and TypeScript).

### `src.dotnet`

The .NET process uses the Reflection API, to read the APIs (i.e. the interfaces and classes) and the API calls,
from the system which you're browsing.

### `better-sqlite3`

The SQLite component is a cache of the API data which the .NET component reads.
It also stores any user-configurable display options.

### `Graphviz`

The Graphviz process creates image files of the selected APIs, to be displayed by the renderer.

### `src/main`

The main process is the controller which implements the bridge between other components.

## User interface

The user interface has three panes:

- Left -- a list of the components in the solution being browsed
- Centre -- the selected components and their APIs
- Right -- details of the selected API

When you select a component in the left-hand pane then it's displayed in the centre with its immediate neighbours,
i.e. with the components which it calls and the components which call it.

The components are displayed as a directed graph.

The graph can be panned and zoomed.

The graph is clickable, which is implemented using Graphviz image maps.
