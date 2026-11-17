---
title: Source directories
nav_order: 1
layout: home
parent: Code design
---

# Source directories
{: .no_toc }

The build derives from the `sqlite` branch of https://github.com/cwellsx/electron_forge_template

- TOC
{:toc}

## Introduction

| Code in this directory | Uses these technologies                             |
| ---------------------- | --------------------------------------------------- |
| `src/main`             | Electron, Node.js, SQLite, Graphviz, Electron CGI   |
| `src/renderer`         | React                                               |
| `src.net`              | .NET, `System.Reflection`, `ICSharpCode.Decompiler` |
| `.vscode`              | VS Code                                             |

## `src/main`

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

## `src/renderer`

The renderer process implements the UI (using React and TypeScript).

## `src/shared-types` and `src/preload`

These define the APIs -- the methods and data -- between the renderer and main processes.

## `src.dotnet/`

The .NET process uses the Reflection API, to read the APIs (i.e. the interfaces and classes) and the API calls,
from the system which you're browsing.

It also uses `ICSharpCode.Decompiler` to decompile all method bodies, in order to list all API calls.

## `.vscode`

This defines a `launch.json` to debug the main process and/or the renderer.