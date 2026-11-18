# Packages

What each package in the monorepo is for, grouped by kind. Most entries end by naming the document that holds
their detail. The two front ends are the application-level packages; the rest are libraries they use, or
tooling around them.

## Back end

### [backend](../../packages/backend/)

The largest part of the software: reading a data source, building the model from it, and presenting the
views. It has no `package.json` of its own and is not built independently — it is compiled as part of
`electron-app`, `vscode-ext` and `backend-test`, which is deliberate: building front and back together as one
monolith is the only reliable way to merge their source maps, so that a process can be debugged in TypeScript
across both. As a normal package dependency, the front end ends up debugging emitted JavaScript rather than
the backend's own sources. One copy of the code, and one place to change it, is the second reason. Building
it as a package with TypeScript **project references** may one day replace the arrangement.

Its folders group by concern rather than by package — `sql*` for storage, `view*` for the views, `presenter`
for what sits between them.

### [backend-dotnet](../../packages/backend-dotnet/)

The .NET component, built with `dotnet` rather than npm and invoked as `Core.exe`. It reflects over a build
or installation folder and decompiles what it finds, emitting JSON that the backend then reads.

Microsoft platform assemblies are not reflected or decompiled in full: only the signatures of referenced
members are read.

### [sqlio](../../packages/sqlio/)

A thin wrapper over SQLite — tables, queries, joins and transactions — with the shape of the underlying
driver kept visible rather than abstracted away.

It may be obsoleted when VS Code's Node gains a built-in SQLite API, which is why the wrapper is thin and its
implementation replaceable. Meanwhile it must be rebuilt whenever Electron's version changes, which is why
`electron-app` and `vscode-ext` must agree on that version.

It takes the path of the native binding as a parameter, because the driver's `.node` file cannot be loaded
from inside a packaged application's archive. See ELECTRON-APP-BUILD.md for why, and for where the path comes
from.

## Front end

### [electron-app](../../packages/electron-app/)

The primary front end: an Electron main process and a React renderer, built by Electron Forge. It owns the
configuration that drives the build, the plugins that go with it, and the wiring of the database and
`Core.exe` into the running application. See ELECTRON-APP-BUILD.md.

### [vscode-ext](../../packages/vscode-ext/)

The VS Code extension front end, sharing the backend with the Electron application. It does not yet load
`Core.exe` at run time: it reads the model through `sqlio` directly, where `electron-app` calls `setPaths` and
`openDataSource`.

## Test

### [backend-test](../../packages/backend-test/)

Tests for the backend, run with `electron-mocha`, including those that load a real model and compare the
resulting views against recorded snapshots. See TESTING.md.

### [electron-app-test](../../packages/electron-app-test/)

Tests for the renderer, run with `vitest`. See TESTING.md.

## Build

### [electron-forge-resource-plugin](../../packages/electron-forge-resource-plugin/)

A plugin for Electron Forge, written for this project: it makes an external resource — `Core.exe` —
available to the application in both a development run and a packaged one. See ELECTRON-APP-BUILD.md.
