---
title: Installation
nav_order: 3
layout: home
---

# Installation
{: .no_toc }

- TOC
{:toc}

## Install the source code

Installing the project's source code, to build it locally, should be simple:

```
git clone https://github.com/cwellsx/apis.git
cd apis
npm install
```

# Monorepo with two projects

This is a "monorepo" which is used to build two projects.

| Folder                  | Workspace  |
| ----------------------- | ---------- |
| `packages/electron-app` | `apis`     |
| `packages/vscode-ext`   | `sys-view` |

The "workspace" name is defined in the the "name" field in that project's `package.json` -- it is not the folder name:

- `apis` in [packages/electron-app/packages.json](packages/electron-app/packages.json)
- `sys-view` in [packages/vscode-ext/packages.json](packages/vscode-ext/packages.json)

The "workspace" name is used in npm commands e.g.

- `npm run <script-name> -w <workspace>`
- `npm run <script-name> -workspace=<workspace>`
- `npm install <package-name> --workspace=my-app`

The two projects are minimally coupled -- each has its own independent and self-contained tsconfig and webpack configuration.

The build configurations for the two were created separately from the following templates:

| Project      | Template       |
| ------------ | -------------- |
| electron-app | Electron Forge |
| vscde-ext    | `yo code`      |

The reason why the two are in one monorepo is so that they can share the code which is now contained in the `packages/shared` folder.
This code is included in both via the webpack configuration of both projects.

There's a single `.vscode` folder in the root of the repo.

- This includes a `launch.json` with configurations for both applications.
- To build-and-debug one component or another, run F5 with one of targets.
- Or to build, package, lint, etc., use `npm run` on the command-line.

## Shared code

The two have code in common,
which is in the packages/shared project.

This code does NOT have its own package.json and tsconfig.json --
I tried this but the problem is:

- The shared package is built
- vscode-ext declares it as a dependency
- The map files refer to the TypeScript of the vscode-ext but the JavaScript of the shared
- The user can debug the vscode-ext but not the shared code

So instead:

- shared is not a package, it has no package.json nor tsconfig.json
- the vscode-ext tsconfig.json and webpack.config.json and launch.json are extended to build code in the shared directory also

This problem is only because I want to debug the two together.
If I were willing to debug one or the other then I could build them separately.

To build them separately:

- Add shared/package.json and shared/tsconfig.json to shared
- Define shared as a dependency of vscode-ext
- Edit vscode-ext/tsconfig.json to specify composite and references, and to remove include and paths

## better-sqlite3

`better-sqlite3` relies on `node-gyp` --
this needs both Python and C++ build tools on Windows,
so install both before running `npm install`.

The current verion of `node-gyp` requires a down-level versions of Python i.e. 3.10.
A way to fix this in future may be to use
https://www.npmjs.com/package/@electron/node-gyp
or eventually a later version of Electron.

## SQLite dependencies

This currently uses in the `better-sqlite3` package which has native components.

I hope to replace this in a future version, when:

- Node has built-in SQLite support
- VS Code is using a version of Electron with that version of node.

Until then, this uses `better-sqlite3`.

### Compiler

To build that I need a native compile installed i.e.

- `C:\Program Files\Microsoft Visual Studio\2022\<Edition>\VC\Tools\MSVC\`

This should be version 14.29 or higher to support `/std:c++20`.

When the compiler is installed, the bindings are built when you do `npm install`.

> [Installation](https://github.com/WiseLibs/better-sqlite3?tab=readme-ov-file#installation)
>
> `npm install better-sqlite3`
>
> Requires Node.js v14.21.1 or later. Prebuilt binaries are available for LTS versions. If you have trouble installing, check the troubleshooting guide.

### Build tools

According to [this](https://github.com/cwellsx/electron_forge_template/blob/sqlite/BOILERPLATE.md#integrate-sqlite)
there are "Windows build tools" which are an options in the Windows Installer for Node.

> To ensure that's integrated with the Node environment:
>
> - Download and install the latest version of the Windows Installer for Node
> - Enable the "Windows build tools" option before installing

### Which version?

There's also an [electron-rebuild](https://github.com/electron/rebuild) package -- which could be useful, but which I haven't tried.

The problem is:

- This builds for a specific version of the Node ABI (binary interface)
- The ABI varies with the version of Node
- The version of node varies with the version of Electron
- The version of Electron with the version of VS Code
- You may have a different version of Node on your machine as your development environment

Therefore all the following must be sufficiently close:

- Version of Node on your machine
- Version of Node used in Electron by VS Code
- Version of Node used in Electron by the electron-app

If you update the version of Electron which is a devDependency of the electron-app,
this in turn might depend on the version of the Electron Forge scripts,
and the implementation of the `electron-forge-resource-plugin`.

References:

- The version of Electron used by VS Code can be found in its Help/About dialog - it's currently 37.3.1
- The [Electron Releases Timeline](https://www.electronjs.org/docs/latest/tutorial/electron-timelines) says which version of Node is used by each version of Electron.
- The [abi_version_registry.json](https://github.com/nodejs/node/blob/HEAD/doc/abi_version_registry.json) specifies the ABI for each version.

And here is a link to [Node.js Releases](https://nodejs.org/en/about/previous-releases) --
that's less relevent except trying to predict when the [Node.js SQLite API](https://nodejs.org/api/sqlite.html) will be available in Electron and VS Code.

The `abi_version_registry.json` reveals that the ABI for Node and Electron are incompatible.

So it's not enough to build it in the usual way -- in which case it would target the version of Node on the machine.

Therefore `electron-rebuild` is installed as a dev dependency in the electron app and should be run -- it rebuilds.

## Common TypeScript version

The problem I found when trying to do cross-module builds
was partly caused by having different TypeScript versions,
so that tsloader may run a random version
which doesn't support the modern node typescript definitions.

    C:\Dev\apis>npm ls typescript
    apis@ C:\Dev\apis
    +-- @your-workspace/shared@0.1.0 -> .\packages\shared
    | `-- typescript@5.9.2
    +-- apis@0.1.0 -> .\packages\electron-app
    | +-- @typescript-eslint/eslint-plugin@5.62.0
    | | `-- tsutils@3.21.0
    | |   `-- typescript@4.5.5 deduped
    | +-- fork-ts-checker-webpack-plugin@7.3.0
    | | `-- typescript@4.5.5 deduped
    | +-- ts-loader@9.5.4
    | | `-- typescript@4.5.5 deduped
    | +-- ts-node@10.9.2
    | | `-- typescript@4.5.5 deduped
    | `-- typescript@4.5.5
    `-- sys-view@0.0.1 -> .\packages\vscode-ext
    +-- @typescript-eslint/eslint-plugin@8.43.0
    | +-- @typescript-eslint/type-utils@8.43.0
    | | `-- typescript@5.9.2 deduped
    | +-- @typescript-eslint/utils@8.43.0
    | | `-- typescript@5.9.2 deduped
    | +-- ts-api-utils@2.1.0
    | | `-- typescript@5.9.2 deduped
    | `-- typescript@5.9.2 deduped
    +-- @typescript-eslint/parser@8.43.0
    | +-- @typescript-eslint/typescript-estree@8.43.0
    | | +-- @typescript-eslint/project-service@8.43.0
    | | | `-- typescript@5.9.2 deduped
    | | +-- @typescript-eslint/tsconfig-utils@8.43.0
    | | | `-- typescript@5.9.2 deduped
    | | `-- typescript@5.9.2 deduped
    | `-- typescript@5.9.2 deduped
    `-- typescript@5.9.2

This was fixed by updating apis to the more-recent typescript version.

In theory this could be a project
with its own project.json and tsconfig.json

and be declared as a dependency in vscode-ext/package.json

```json
  // or specify `workspace:*` if using pnpm or yarn workspaces
  "dependencies": {
    "@cwellsx/shared": "*"
  },
```

In this case the shared package-lock.json would have an entry like this

```json
    "node_modules/@cwellsx/shared": {
      "resolved": "packages/shared",
      "link": true
    },
```

But pre-building the shared makes it difficult to debug both
because the map file of the vscode-ext would reference the pre-build JS (not the TS) of the shared.


## Updating the Electron Forge dependendies

There's no automated way to update the Electron Forge dependendies
so just update them all to the new version.

Before you do this, I recommend you create a scratch version of the newest template:

    npx create-electron-app@latest trash --template=webpack-typescript

Then compare the current version with the new template:

    npm install --save-dev @electron-forge/cli@latest

## Build your own executable

After you install source code, run `npm run make` to build an executable which you can deploy.

I edited `forge.config.ts` so this builds a ZIP file.

The default was to create a `Setup.exe` using `Squirrel.Windows` -- see https://www.electronforge.io/config/makers

## Prebuilt executables

I could, but have not yet, posted prebuilt executables to GitHub.

## Local certificate error

When you run `npm install` you may see an error message related to a local certificate.

Google's search results for this error message suggests it may be caused by a corporate firewall
doing a man-in-the-middle.

To resolve this:

- Fix or work-around the problem with your (corporate) environment
- Use a private/personal machine instead
- Get or make a prebuilt executable, instead of using `npm` to install and build from source code.
