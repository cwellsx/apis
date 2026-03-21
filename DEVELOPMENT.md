# Development

- [Packages](#packages)
  - [`backend`](#backend)
  - [`backend-dotnet`](#backend-dotnet)
  - [`sqlio`](#sqlio)
  - [`backend-test`](#backend-test)
  - [`electron-app` and `vscode-ext`](#electron-app-and-vscode-ext)
- [Scripts](#scripts)
  - [`electron-app`](#electron-app)
  - [`vscode-ext`](#vscode-ext)
    - [Build Without Running](#build-without-running)
    - [Running / Debugging](#running-debugging)
    - [Unit Tests](#unit-tests)
    - [Packaging / Publishing](#packaging-publishing)
  - [`backend-test`](#backend-test-1)
- [Launch and Debug configurations](#launch-and-debug-configurations)
  - [Launch `electron-app`](#launch-electron-app)
  - [Launch `vscode-ext`](#launch-vscode-ext)
  - [Tasks (referenced by `preLaunchTask` in launch configs)](#tasks-referenced-by-prelaunchtask-in-launch-configs)

## Packages

This monorepo includes these packages subfolders:

```cmd
>dir packages /b
backend
backend-dotnet
backend-test
electron-app
sqlio
vscode-ext
```

And these `package.json`

```bash
>git ls-files */package.json
packages/backend-dotnet/package.json
packages/backend-test/package.json
packages/electron-app/package.json
packages/sqlio/package.json
packages/vscode-ext/package.json
```

### `backend`

The `packages/backend` folder contains source code but no `package.json` -- because is not built as an independent package:

- Instead it's included in the build of `electron-app` and `vscode-ext`
- If you search for `backend/src` you will find that referenced in the `webpack.*` and `tsconfig.json` of the two main packages

This backend contains most of the logic -- `electron-app` and `vscode-ext` are the two UI front ends.

The reason why it's not built independently is because building front and back together as a monolith makes for better debugging --
otherwise, if it's a classic package dependency, the front-ends' source maps don't seem able to resolve to the back-end TypeScript source files.

### `backend-dotnet`

This is a .NET component which the `backend` code invokes at run-time.

- `electron-app` builds and includes it via the `ResourcePlugin` entry in `forge.config.ts` which initializes `CORE_EXE`
- `backend-test` builds it using an explicit script named `build-dotnet`
- `backend` requires the app to pass its path via the `coreExePath` parameter which is passed to the `setPaths` function
- `vscode-ext` builds the `backend` but does not yet load it at run-time -- its `adapter.ts` invokes `createSqlDatabase` -- unlike `electron-app` which calls `setPaths` and `openDataSource`

### `sqlio`

This encapsulates `better-sqlite3`.

- This may be obsoleted, when VS Code uses a version of Node.js with built-in support for a SQLite API.
- This must be rebuilt when the version of Electron changes
- For this reason the `electron-app` and `vscode-ext` must both depend on the same version of Electron

### `backend-test`

These are unit-tests of the `backend` source code:

- Primarily meant to regression-test when the `backend` or `backend-dotnet` code is changed
- Builds the `backend` using entries in its `tsconfig.json` and using `electron-mocha` and `ts-node` and not `webpack`

### `electron-app` and `vscode-ext`

These are the two 'application-level' packages, where the others are libraries/dependencies.

## Scripts

Use `-w` to run these scripts from the root of the monorepo, for example

```
npm run lint -w apis
```

| Subfolder of `packages` | Workspace name in `packages.json` |
| ----------------------- | --------------------------------- |
| `backend-test`          | `backend-test`                    |
| `electron-app`          | `apis`                            |
| `sqlio`                 | `sqlio`                           |
| `vscode-ext`            | `sys-view`                        |

### [`electron-app`](./packages/electron-app/package.json)

| Script       | Purpose                  | When to use it         |
| ------------ | ------------------------ | ---------------------- |
| `type-check` | TS compile errors only   | Before running the app |
| `watch`      | Continuous TS checking   | While developing       |
| `start`      | Run Electron in dev mode | When testing the app   |
| `make`       | Build installers         | For releases           |
| `lint`       | Style & quality checks   | Before commits / CI    |

### [`vscode-ext`](./packages/vscode-ext/package.json)

#### Build Without Running

| Script         | Purpose                                  | When to use it                                         |
| -------------- | ---------------------------------------- | ------------------------------------------------------ |
| `build-shared` | Builds the shared package in `../shared` | When the extension depends on updated shared code      |
| `compile`      | Bundles the extension using webpack      | Before running/debugging if you changed extension code |
| `lint`         | Runs ESLint on `src`                     | When cleaning up code or before commits                |

#### Running / Debugging

For VS Code extensions, the normal workflow is:

- Press `F5`
- VS Code launches the extension host
- Webpack builds are triggered automatically via the `pre*` scripts

So you rarely need to run `watch` manually unless you prefer a separate terminal constantly rebuilding.

| Script  | Purpose                    | When to use it                                            |
| ------- | -------------------------- | --------------------------------------------------------- |
| `watch` | Runs webpack in watch mode | Use only if you want continuous rebuilds outside VS Code. |

#### Unit Tests

| Script          | Purpose                                        | When to use it                |
| --------------- | ---------------------------------------------- | ----------------------------- |
| `compile-tests` | Compiles test TypeScript into `out/`           | Before running tests manually |
| `watch-tests`   | Watches and recompiles tests                   | When iterating on tests       |
| `test`          | Runs VS Code extension tests via `vscode-test` | To execute the test suite     |

#### Packaging / Publishing

| Script              | Purpose                                          | When to use it                               |
| ------------------- | ------------------------------------------------ | -------------------------------------------- |
| `package`           | Production webpack build with hidden source maps | When preparing a production‑ready bundle     |
| `vscode:prepublish` | Automatically runs `package` before publishing   | Triggered by `vsce publish` or `npm publish` |

### [`backend-test`](./packages/backend-test/package.json)

| Script         | Purpose                      | When to use it                                      |
| -------------- | ---------------------------- | --------------------------------------------------- |
| `build-dotnet` | Rebuild the .NET plugin      | After changing the .NET source code                 |
| `test-slow`    | Run the .NET plugin          | After rebuilding .NET or changing the SQLite schema |
| `test`         | Run all tests in `*.test.ts` | To execute the test suite                           |

## Launch and Debug configurations

### Launch `electron-app`

| Name                | When                                | How                                                       |
| ------------------- | ----------------------------------- | --------------------------------------------------------- |
| `Electron Main`     | Debug the Electron main process     | Launches Node with Electron Forge’s `vscode.cmd`          |
| `Electron Renderer` | Debug the Electron renderer process | Attaches Chrome debugger to port `9222`                   |
| `Electron All`      | Debug both main + renderer together | Compound config combining ElectronMain + ElectronRenderer |

### Launch `vscode-ext`

| Name              | When                                                                | How                                                                                         |
| ----------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `Run Extension`   | Run or debug the VS Code extension in a fresh Extension Host window | Launches `extensionHost` with `--extensionDevelopmentPath` and triggers `vscode-ext: watch` |
| `Extension Tests` | Run or debug the extension’s test suite inside a VS Code window     | Launches `extensionHost` with `--extensionTestsPath` and triggers `vscode-ext: watch`       |

### Tasks

These tasks are referenced by `preLaunchTask` in launch configs -- you do not normally need to run them separately.

| Name                            | When                                                   | How                                                                    |
| ------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `vscode-ext: watch`             | Automatically rebuild the extension while debugging    | Runs `npm run watch` in `packages/vscode-ext` with `$ts-webpack-watch` |
| `vscode-ext: watch-tests`       | Automatically rebuild test files while debugging tests | Runs `npm run watch-tests` in `packages/vscode-ext` with `$tsc-watch`  |
| `vscode-ext tasks: watch-tests` | Start both extension + test watchers together          | Depends on `ExtWatch` and `ExtWatchTests`                              |
