# The electron-app build

How the Electron application is built and packaged, and what the resource plugin does in each mode. Forge
drives all of it; what follows describes the parts of the configuration that are not obvious from reading it.

## What runs the build

`electron-forge` is the entry point, through the scripts in `packages/electron-app/package.json`:

| script    | does                                                                            |
| --------- | ------------------------------------------------------------------------------- |
| `start`   | builds in development mode and runs the application from the source tree         |
| `package` | builds in production mode and assembles a runnable folder under `out/`            |
| `make`    | packages, then runs the makers to produce archives                                |
| `publish` | would upload the made artifacts; no publisher is configured, and Forge 8 renamed it `release` |

`prestart`, `prepackage` and `premake` build the resource plugin first, because Forge loads that plugin
from its compiled output rather than from source.

## The two plugins

`forge.config.ts` registers `WebpackPlugin`, which builds the bundles, and `ResourcePlugin`, which is a
package in this monorepo.

### WebpackPlugin

Builds the main process into `.webpack/main/` and serves the renderer from a development server. Since
Forge 8 the main bundle is emitted as `index.cjs`, which is why `"main"` in `package.json` names
`.webpack/main/index.cjs` rather than the directory -- Node's directory lookup does not find a `.cjs`.

### ResourcePlugin

This plugin exists to make an external binary -- `Core.exe`, the .NET component -- available to the
application in both modes, without the application needing to know where the binary came from.

**It is included in the Forge config.** `forge.config.ts` imports it and instantiates it with `env`,
`path`, `build` and `package` options.

**Forge integrates it when it runs.** Forge instantiates plugins from the config and calls their hooks, so
the plugin's own log lines appear in the output of every command: `ResourcePlugin: constructor`, `init`,
`getHooks`, `resolveForgeConfig`, then `generateAssets` and `prePackage`. Note that `generateAssets` runs
for `start` as well as for `package`.

**It injects the path into the run time.** `resolveForgeConfig` adds a webpack define, so the main process
has `CORE_EXE` compiled in. The value depends on the mode:

| mode      | `CORE_EXE`                                                                |
| --------- | ------------------------------------------------------------------------- |
| `start`   | `../backend-dotnet/Core/bin/Release/net8.0/Core.exe`, relative to the working directory |
| `package` | `resources\core\Core.exe`, relative to the packaged application            |

**It copies the binary when packaging.** Its `generateAssets` hook compares the dates of the .NET sources
against the built executable and runs `dotnet build` only when the sources are newer, logging
`Not rebuilding: ...` otherwise. At `prePackage` it copies the whole `bin/Release/net8.0` directory to a
temporary directory, which the Forge config then names as `extraResource`; Forge places that in the
packaged application as `resources/core/`.

## What the packaged application looks like

`out/<productName>-<platform>-<arch>/` holds the executable and the Electron runtime, with the application
itself inside `resources/app.asar` and anything that must remain a real file beside it, in
`resources/app.asar.unpacked/`.

Two consequences worth remembering:

- A native module -- `better-sqlite3`, through `sqlio` -- cannot be loaded from inside the archive, so it is
  unpacked; the code that loads it must resolve the path from the bundle's own directory, not from the
  working directory, which differs between a development run and a launched application.
- `extraResource` is what puts `Core.exe` in `resources/core/`, so a change to that part of the plugin is
  exercised by `package` and not by `start`.