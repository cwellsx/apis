# Code design

This Electron application includes these components:

- [Source directories](#source-directories)
  - [`src/main`](#srcmain)
  - [`src/renderer`](#srcrenderer)
  - [`src/shared-types` and `src/preload`](#srcshared-types-and-srcpreload)
  - [`src.dotnet/`](#srcdotnet)
  - [`.vscode`](#vscode)
- [Third-party components](#third-party-components)
  - [SQLite](#sqlite)
  - [Graphviz](#graphviz)
  - [Electron](#electron)
  - [Electron CGI](#electron-cgi)
  - [Electron Forge](#electron-forge)
  - [Npm components](#npm-components)
  - [Icons](#icons)

The build derives from the `sqlite` branch of https://github.com/cwellsx/electron_forge_template

## Source directories

### Introduction

| Code in this directory | Uses these technologies                             |
| ---------------------- | --------------------------------------------------- |
| `src/main`             | Electron, Node.js, SQLite, Graphviz, Electron CGI   |
| `src/renderer`         | React                                               |
| `src.net`              | .NET, `System.Reflection`, `ICSharpCode.Decompiler` |
| `.vscode`              | VS Code                                             |

### `src/main`

The main process is the controller:

- Uses the Node.js and Electron APIs
- Launches the src.net process to get reflected data
- Caches the data in a local SQLite database
- Loads the data from SQLite
- Formats the data as a view
- Launches Graphviz to render the data as an image
- Passes the data and the image to the renderer for display

UI events from renderer change the view options:

- Save the new options in SQLite
- Recreate the view with new options
- Send the new view to the renderer

### `src/renderer`

The renderer process implements the UI (using React and TypeScript).

### `src/shared-types` and `src/preload`

These define the APIs -- the methods and data -- between the renderer and main processes.

### `src.dotnet/`

The .NET process uses the Reflection API, to read the APIs (i.e. the interfaces and classes) and the API calls,
from the system which you're browsing.

It also uses `ICSharpCode.Decompiler` to decompile all method bodies, in order to list all API calls.

### `.vscode`

This defines a `launch.json` to debug the main process and/or the renderer.

## Third-party components

### SQLite

The SQLite component caches the API data which the .NET component reads.
It also stores any user-configurable display options.

### Graphviz

The Graphviz process creates image files of the selected APIs, to be displayed by the renderer.

### Electron

This toolkit lets you write code which runs:

- In a window, using a browser engine (e.g. using React, and/or HTML, CSS, JS, etc.)
- In another 'main' process, which can access the Node API and the local file system etc.
- Between the two, application-specific APIs to exchange data between the main process and the browser window

### Electron CGI

This package lets you invoke an external process from the Electron application
and communicate with it via JSON over the standard input and output streams.
I use it to communicate with the .NET process.

### Electron Forge

This is scripts and config files to build and package an Electron application like this one.

### Npm components

The renderer code uses these React components from npm:

- `split-pane-react`
- `react-image-mapper2`
- `react-checkbox-tree`

The main (i.e. backend) code uses these:

- `better-sqlite3`
- `xml-js`
- `electron-cgi`

### Icons

A README in the `./icons` folder lists the provenance of the icons in this application.
