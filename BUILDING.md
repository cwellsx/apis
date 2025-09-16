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
