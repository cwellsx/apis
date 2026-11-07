# Architecture

How the **API Viewer** is put together: the packages, the layers, and how data flows from a folder of
.NET assemblies to an interactive diagram. For _what_ the tool is, see [`README.md`](./README.md).

## 1. What it does

The tool reads a .NET build or installation folder, reflects its assemblies, and builds a model of the
software as a **token tree** — packages, namespaces, types and methods — with **method calls** modelled
as `from → to` token pairs. From that model it renders interactive views: references between
assemblies, call graphs/APIs, method call stacks, and custom data. Everything runs locally; the model
never leaves the machine.

## 2. At a glance

```
   electron-app (Electron + React)         vscode-ext (VS Code extension)
                 \                                   /
                  \___  shared backend source  _____/
                                 |
                          backend  (model + presentation)
                          /                           \
        backend-dotnet (Core.exe)                sqlio (better-sqlite3)
        reflection + decompiler                       SQLite
```

## 3. Packages

| Package                      | npm name            | Role                                                          | Built                                  |
| ---------------------------- | ------------------- | ------------------------------------------------------------- | -------------------------------------- |
| `packages/backend`           | —                   | Model + presentation logic.                                   | Included into consumers; no own build. |
| `packages/backend-dotnet`    | `backend-dotnet`    | `Core.exe`: reflects assemblies and decompiles method bodies. | `dotnet build`                         |
| `packages/sqlio`             | `sqlio`             | Encapsulates `better-sqlite3`.                                | `tsc -b`                               |
| `packages/backend-test`      | `backend-test`      | Tests for `backend`.                                          | via `tsconfig` (no webpack)            |
| `packages/electron-app`      | `apis`              | Electron main + React renderer (primary UI).                  | Electron Forge / webpack               |
| `packages/electron-app-test` | `electron-app-test` | Tests for renderer components.                                | Vitest                                 |
| `packages/vscode-ext`        | `sys-view`          | VS Code extension (webview + tree views).                     | webpack                                |

**Why `backend` has no `package.json`.** It is compiled _into_ its consumers rather than published as
a dependency. Building front end and back end as one monolith is the only reliable way to get
TypeScript-aware source maps across the boundary; as a normal package dependency, the front end ended
up debugging emitted JavaScript instead of the backend `.ts` sources.

## 4. Contracts

`packages/backend/contracts` defines the types shared between the backend and the front ends, in three
layers with **no cyclic dependencies**:

```
dotnet  →  ui  →  app
```

- **`contracts/dotnet`** — no dependencies. The shapes produced by `Core.exe` (reflected data, ids).
- **`contracts/ui`** — depends on `dotnet`. The view-model types the UI displays: nodes, edges, image,
  node ids, node state, app options.
- **`contracts/app`** — depends on `ui`. The application API: `DataSource`, `OpenDataSource`,
  `AppConfig`, `Paths`, `PresenterApi`, `ShowProgress`, menu.

`packages/backend/src` re-exports these through barrels (`contracts-app.ts`, `contracts-ui.ts`,
`contracts-dotnet.ts`, `contracts-custom.ts`), so backend code imports from `../contracts-app`, etc.

## 5. Backend layering

Within `packages/backend/src`, responsibilities stack top-down:

```
SQLite (normalized schema, sql2)
  ↓  SQL core     — thin domain API over the tables
  ↓  GraphQuery   — UI-oriented read model
  ↓  View state   — persisted per-node UI state (expanded / closed / selected)
  ↓  View model   — selected view → image + nodes (createPresenter)
  ↓  Renderer     — GraphViz SVG + tree view
```

## 6. Data flow

**Ingest — build the model:**

```
assemblies folder
  → backend-dotnet (Core.exe): System.Reflection + ICSharpCode.Decompiler
  → JSON (Reflected / All)
  → dotNetApi (TypeScript ↔ .NET bridge)
  → sql2 inserters (SqlLoaded.save) → SQLite
```

**Render — show a view:**

```
selected view (dotnet / custom)
  → viewState (forest of nodes + node state)
  → viewModel (createPresenter → imageData)
  → image (toDotFormat → GraphViz via @viz-js/viz)
  → SVG (with hit areas merged from the cmapx image map)
  → DisplayApi / RendererApi  →  Electron window or VS Code webview
```

UI events (expand/collapse, filter, menu) flow back through `PresenterApi`, update view state in
SQLite, and re-render.

## 7. Key modules (`packages/backend/src`)

| Module                       | Responsibility                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| `contracts-*.ts`             | Barrels re-exporting `contracts/{dotnet,ui,app}`.                                                     |
| `id2`                        | Branded id types (`TypeId`, `MethodId`, …) and their factories.                                       |
| `sql2`                       | Normalized schema + inserters: assemblies, namespaces, types, members, calls, ancestors, view states. |
| `sqlCommon`                  | Shared schema/state helpers (node states, config).                                                    |
| `sqlAppConfig` / `sqlCustom` | Persistence for app config and custom data sources.                                                   |
| `openDataSource`             | Entry point: `openDataSource(dataSource, showProgress)` → `openFromDotNet` / `openFromCustom`.        |
| `viewState`                  | The node forest and per-node state.                                                                   |
| `viewModel`                  | `createPresenter`, `selectedView`, image data, `PresenterApi`.                                        |
| `image`                      | GraphViz rendering: DOT formatting, running viz, SVG post-processing (`insertSvgMap`).                |
| `utils`                      | `assert`, `getOrThrow`, paths, fs, log.                                                               |

## 8. Domain notes

- **Metadata tokens.** The compiler gives every type and method a numeric metadata token, unique within
  an assembly. The tool reads them and, together with assembly names, uses them as SQLite keys.
- **Compiler-generated types.** Anonymous delegates and async state machines create hidden types. They
  are mapped back to the owning user method (`compilerMethods.ts`) so they never surface to the user.
- **Microsoft assemblies.** Platform assemblies are not reflected/decompiled in full — only the
  signatures of referenced members are read.
- **Custom data.** A second data-source kind (`customJson`) renders hand- or tool-authored graphs
  alongside the reflected ones.

## 9. Front ends

- **`electron-app`** — the primary UI. The main process (`src/main`) owns the model and the SQLite
  database; the React renderer (`src/renderer`) draws the SVG graph (`Graph.tsx`), the node tree,
  options and detail panels. The SVG is injected inline, so CSS `:hover` styling applies.
- **`vscode-ext`** — a second front end sharing `backend`: a webview for the graph plus two tree views.
  It builds the backend but does not yet load `Core.exe` at run time.

## 10. Tech stack & constraints

- **TypeScript** ~5.9.2 (down-level); VS Code is pinned to the repo's TypeScript (`js/ts.tsdk.path`).
- **Node** 22 (`.nvmrc`), **Electron** 37.6.0, **React** 19.3, Electron Forge (webpack), SCSS,
  FlexLayout, `@viz-js/viz` (GraphViz), `@xmldom/xmldom`.
- **.NET** 8 with Mono.Cecil, ICSharpCode.Decompiler, System.Reflection.Metadata.
- **Storage**: SQLite via `better-sqlite3` (`sqlio`).
- **Constraints**: `better-sqlite3` must be rebuilt to match Electron's ABI; `backend` is not built
  independently; GraphViz is slated for replacement (ELK/Dagre) for large graphs.
