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

`packages/backend/contracts` defines the types shared between the backend and the front ends, in four
layers with **no cyclic dependencies**:

```
dotnet  no dependencies
config  no dependencies
ui      depends on dotnet and config
app     depends on ui and config
```

- **`contracts/dotnet`** — no dependencies. The shapes produced by `Core.exe` (reflected data, ids).
- **`contracts/config`** — no dependencies. The settings model: `AppOptions`, `DotnetOptions` and
  `CustomOptions`, their union `AnyOptions`, and a schema per kind — the shape VS Code describes an
  extension's settings in — which is what the options panel renders.
- **`contracts/ui`** — depends on `dotnet` and `config`, because an event carries the options. The
  view-model types the UI displays: nodes, edges, image, node ids, node state.
- **`contracts/app`** — depends on `ui` and `config`. The application API: `DataSource`, `OpenDataSource`,
  `AppConfig`, `Paths`, `PresenterApi`, `ShowProgress`, menu.

`packages/backend/src` re-exports these through barrels (`contracts-app.ts`, `contracts-config.ts`,
`contracts-ui.ts`, `contracts-dotnet.ts`, `contracts-custom.ts`), so backend code imports from
`../contracts-app`, etc. The front ends import them through the `backend-*` path aliases.

## 5. Backend layering

Within `packages/backend/src`, responsibilities stack top-down:

```
SQLite (normalized schema, sqlDotNet)
  ↓  SQL core     — thin domain API over the tables
  ↓  GraphQuery   — UI-oriented read model
  ↓  View state   — persisted per-node UI state (hidden / expanded)
  ↓  Options      — the selected view's own settings, persisted with the data source
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
  → sqlDotNet (createTables, insertAll) → SQLite
```

**Render — show a view:**

```
selected view (dotnet / custom)
  → viewState (forest of nodes + node state)
  → viewModel (createPresenter → imageData)
  → image (toDotFormat → GraphViz via @viz-js/viz)
  → SVG (with hit areas merged from the cmapx image map)
  → IPC  →  RendererApi.show  →  Electron window or VS Code webview
```

UI events (expand/collapse, filter, menu, options) flow back through `PresenterApi`. Each is applied where
it belongs — node state, or the view's options, both in SQLite — and the views are then re-rendered and
sent. A batch of events may ask `showViews` for the menu items or the options as extra views, which is how
the options panel is told what was stored.

## 7. Key modules (`packages/backend/src`)

| Module                       | Responsibility                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| `contracts-*.ts`             | Barrels re-exporting `contracts/{dotnet,config,ui,app}`.                                              |
| `id`                         | Branded id types (`TypeId`, `MethodId`, …) and their factories.                                       |
| `sqlDotNet`                  | Normalized schema + inserters: assemblies, namespaces, types, members, calls, ancestors, view states. |
| `sqlCommon`                  | Shared schema/state helpers: node states, and the config KVPs, which hold the view's options.         |
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
- **Calls are rolled up to every level — a core invariant.** `Core.exe` emits method→method calls;
  `insertCalls` then rolls each side up through type, namespace and assembly, so a row exists for any pair
  of ids at the same granularity. The two sides are rolled up in that order — the from-side passes first,
  then the to-side passes, which read the table and therefore roll up the already-rolled rows too — and it
  is that ordering, rather than two independent steps, which yields every combination. The application
  reads these rows instead of deriving the relationships itself: the ancestry and the roll-up live in the
  tables, and a query may assume that whatever is below a node is already a row. Rows stop at assemblies: a
  _group_ of assemblies exists only to add and remove assemblies from the graph, and never has edges of its
  own. A call whose target is a methodSpec — a generic method reference — is resolved to its definition by
  `insertResolvedSpecs` before any roll-up pass runs, so it has rows at every level like any other call;
  the spec rows are kept as well, and the resolution is not recorded as ancestry (see the next bullet).
- **A methodSpec is an instantiation of a method definition, and that is not modelled as ancestry.** The
  dataset has both: a call to a generic method targets a _spec_, and the spec resolves to a definition —
  which is what the roll-up works from, so such a call has rows at every level like any other.
  Recording that resolution as a parent link — "the parent of a spec is its definition" — would be
  truthful, but it is deliberately not done: the roll-up tables record the tree, a spec is not a child of
  the definition's _type_, and the popup does not care which of the two it shows today. It will matter
  when call stacks are shown, because that means following the calls as they actually were,
  instantiations included — which is why the spec rows are kept in `calls` rather than replaced.
- **A drawn edge is a bundle; the popup shows one level down.** The graph draws only the `calls` rows at
  the level of the visible leaves, so one drawn edge stands for every call beneath it. `getEdgeLabels`
  resolves the layer directly below it via the `parents` table, which lists every node's direct children
  together with the kind of link each one is, and is derived from `ancestors` so that the two cannot
  disagree about which links are direct. So an assembly-level edge shows the calls between its _namespaces_,
  a namespace-level edge those between its types, a type-level edge those between its methods — and a
  method-level edge has nothing below it. A leaf-to-leaf edge therefore has no popup content at all, and
  returns before any query is built. Which side is a leaf is decided by its _kind_: a leaf endpoint is looked
  up at the node itself and `parents` is not consulted for it, while the other side is looked up one level
  down. The three cases — neither endpoint a leaf, one side, the other — are written out as three queries
  rather than assembled from fragments. All of this describes the _calls_ view: the references view has
  references rather than calls, so neither a popup nor a level below applies to it — its leaf is an
  assembly, and an edge between two of those has nothing below it either.
- **Clustering is a view option, and the tree is built in the application.** `clusterNamespaces` and
  `clusterTypes` make a namespace or a type a node inside the one which declares it, so `Foo.Bar.Baz` sits
  inside `Foo.Bar` and is not a node at all unless that is expanded. The tree is walked in the backend
  rather than in SQL because its depth is not known in advance. A cluster's calls are the calls of the node
  it is clustered into — `remapCalls` rewrites each endpoint which is hidden to the node it is hidden in —
  which is what keeps the edges of a collapsed cluster complete. The `kind` mask on `parents` is what lets
  one popup query serve both branches of the option: direct children only, or the clustered namespaces and
  types as well.
- **Hover is local; only clicks round-trip.** Mouse-move fires far too often to query the backend per
  event, so everything a popup needs is preloaded with the render that produced the SVG. Popup data is
  part of the image snapshot, keyed the same way as the SVG's edge hit areas — never a fetch. Clicks are
  the only events that go back to the backend.
- **Assumption: the user keeps the graph small.** Because popups are eager, both the queries (one
  `getPopup` per visible edge) and the payload (edges × their children) grow with the number of visible
  edges. That is affordable only because the user is trusted not to expand many nodes at once (observed
  order of magnitude: ~17 visible edges → ~90 children, too fast to notice). An "expand everything"
  affordance would break it — as it would also break GraphViz (§10).

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
