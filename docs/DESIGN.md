# Implementation design

This is an Electron application.

It is based on the `sqlite` branch of https://github.com/cwellsx/electron_forge_template
and includes the following components.

- [Source directories](#source-directories)
  - [`src/renderer`](#srcrenderer)
  - [`src.dotnet/`](#srcdotnet)
  - [`src/main`](#srcmain)
  - [`src/shared-types` and `src/preload`](#srcshared-types-and-srcpreload)
- [Third-party components](#third-party-components)
  - [`better-sqlite3`](#better-sqlite3)
  - [Graphviz](#graphviz)
  - [Electron](#electron)
  - [Electron Forge](#electron-forge)
  - [React components](#react-components)

## Source directories

### `src/renderer`

The renderer process implements the UI (using React and TypeScript).

### `src.dotnet/`

The .NET process uses the Reflection API, to read the APIs (i.e. the interfaces and classes) and the API calls,
from the system which you're browsing.

### `src/main`

The main process is the controller which implements the bridge between other components.

### `src/shared-types` and `src/preload`

These declare and bind the APIs, between the render and main processes, via which they communicate.

## Third-party components

### `better-sqlite3`

The SQLite component caches the API data which the .NET component reads.
It also stores any user-configurable display options.

### Graphviz

The Graphviz process creates image files of the selected APIs, to be displayed by the renderer.

### Electron

This is a version of WebKit, where you write code which runs:

- In the browser window as usual, e.g. using React
- In another 'main' process, which can access the Node API and the local file system etc.

### Electron Forge

This is scripts and config files to build and package an Electron application like this one.

### Npm components

The renderer code uses these React components from npm:

- `split-pane-react`
- `react-image-mapper2`
- `react-checkbox-tree`

The backend code uses this:

- `xml-js`
