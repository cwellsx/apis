# Testing

How to build, run and validate each part of the repository. Script names live in each `package.json`;
this page explains _which_ to run and _when_. For how the pieces fit together, see
[`ARCHITECTURE.md`](./ARCHITECTURE.md).

> The shell is **Windows PowerShell**: chain commands with `;`, and quote paths containing spaces.
> Run a package script from the repo root with `-w <name>` (for example `npm test -w backend-test`).

## Frameworks at a glance

| Package             | Framework                           | Command                         |
| ------------------- | ----------------------------------- | ------------------------------- |
| `backend-test`      | `electron-mocha` (+ `ts-node`)      | `npm test -w backend-test`      |
| `electron-app-test` | `vitest` (+ Testing Library, jsdom) | `npm test -w electron-app-test` |
| `vscode-ext`        | `vscode-test`                       | `npm test -w sys-view`          |

## `backend-test` (most used)

Unit/regression tests for `backend` and `backend-dotnet`. It compiles `backend` through its own
`tsconfig` and runs `electron-mocha` with `ts-node` (no webpack).

| Script             | Purpose                                                                          |
| ------------------ | -------------------------------------------------------------------------------- |
| `test`             | Run all `test/**/*.test.ts`.                                                     |
| `test-backend`     | `test/backend.ts`.                                                               |
| `test-dotnet-slow` | .NET plugin, slow (`--timeout 60000`).                                           |
| `test-dotnet-load` | .NET load.                                                                       |
| `test-dotnet-view` | .NET view.                                                                       |
| `test-sample`      | `test/**/sample.test.ts`.                                                        |
| `build-dotnet`     | Rebuild `Core.exe` (`npm --workspace=backend-dotnet run build -- backend-test`). |
| `type-check`       | `tsc --noEmit`.                                                                  |

**Prerequisite:** after changing .NET source, run `build-dotnet` before the .NET tests.

## `electron-app-test`

Renderer component tests (Vitest + Testing Library + jsdom), for example `ConfigurationView`.

```powershell
npm test -w electron-app-test
npm run type-check -w electron-app-test
```

## `vscode-ext`

| Script              | Purpose                                                                            |
| ------------------- | ---------------------------------------------------------------------------------- |
| `test`              | Run extension tests via `vscode-test`.                                             |
| `compile-tests`     | Compile tests to `out/`.                                                           |
| `compile` / `watch` | Webpack build (webpack is the type checker here; there is no `type-check` script). |
| `pretest`           | Runs `compile-tests` + `compile` + `lint` automatically before `test`.             |

## Type-checking

Packages that expose `type-check` (`tsc --noEmit`):

```powershell
npm run type-check -w apis                 # electron-app
npm run type-check -w backend-test
npm run type-check -w electron-app-test
```

## Building .NET (`backend-dotnet`)

```powershell
npm --workspace=backend-dotnet run build -- <target>
```

`index.ts` runs `dotnet build ./Core.sln --configuration Release` and copies the output.

## Native module (`sqlio`)

`better-sqlite3` is native and must match the Electron/Node ABI.

```powershell
npm run rebuild -w sqlio     # electron-rebuild -v 37.6.0 -f -w better-sqlite3
npm run build -w sqlio       # tsc -b
```

## Launch & debug (VS Code)

**`electron-app`** — `Electron Main` (main process), `Electron Renderer` (attach to port `9222`),
`Electron All` (both).

**`vscode-ext`** — `Run Extension` (extension host window), `Extension Tests` (tests in a VS Code
window). Both trigger the `vscode-ext: watch` task automatically.

## Typical workflow

- Logic work → run `backend-test` scripts.
- UI work → launch the Electron app (`npm start -w apis`).
- After an edit, a `type-check` is usually enough; the maintainer code-reviews and runs the tests.

## CI

`.github/workflows/pages.yml` publishes the (abandoned) documentation site only — there is no test CI.
