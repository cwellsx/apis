# Constraints

The rules this software must not break, and the assumptions its design rests on. They are collected here
because they were previously stated in three places — the hard constraints and the last section of
`AGENTS.md`, and the small-graph note of the former single architecture document.

`AGENTS.md` keeps its own list, because an agent needs the rules without following a link; this is the
reasoning behind them.

## Rules

- **Microsoft and .NET platform assemblies are not reflected or decompiled in full.** Only the signatures of
  referenced members are read. They are a large body of code that is not the subject of the analysis, and
  decompiling it would cost far more than it tells anyone. See `DATA-MODEL.md`.
- **The contracts have no cyclic dependencies.** `packages/backend/contracts` is layered: `dotnet` and
  `config` depend on nothing, `ui` on those two, and `app` on `ui` and `config`. Nothing enforces it, so it is
  a rule to be kept rather than a property of the build — and it matters to the front ends, because the
  contracts are the only surface they see. See `BACKEND.md` and `INTERFACES.md`.

  ```mermaid
  flowchart LR
      dotnet["contracts/dotnet"] --> ui["contracts/ui"]
      config["contracts/config"] --> ui
      ui --> app["contracts/app"]
      config --> app
  ```
- **`packages/backend` is not built as an independent package.** It has no `package.json` and is compiled as
  part of `electron-app`, `vscode-ext` and `backend-test`. This is deliberate: one copy of the code and one
  place to change it, rather than three packages that must agree.
- **`better-sqlite3`, through `sqlio`, must match Electron's ABI, and `electron-app` and `vscode-ext` must
  use the same Electron version.** A native module is built for one runtime; two runtimes mean two builds
  that must be kept in step. This is the constraint most likely to be felt, and the reason `sqlio` is a thin
  wrapper with a replaceable implementation.
- **The software runs locally.** The model is built from assemblies on disk and never leaves the machine; no
  network connection is used.
- **TypeScript is pinned down-level** (5.9.2), and VS Code is pointed at the
  repository's own TypeScript so that the editor and the build agree.

## Tech stack

- **TypeScript** ~5.9.2 (down-level); VS Code is pinned to the repo's TypeScript (`js/ts.tsdk.path`).
- **Node** 22 (`.nvmrc`), **Electron** 37.6.0, **React** 19.3, Electron Forge (webpack), SCSS, FlexLayout,
  `@viz-js/viz` (GraphViz), `@xmldom/xmldom`.
- **.NET** 8 with Mono.Cecil, ICSharpCode.Decompiler, System.Reflection.Metadata.
- **Storage**: SQLite via `better-sqlite3` (`sqlio`).

## Assumptions the design rests on

- **The user keeps the graph small.** Popup data is preloaded with every render rather than fetched on
  demand, so the cost of both the queries and the payload grows with the number of visible edges. That is
  affordable only because the user is trusted not to expand many nodes at once — an order of magnitude
  observed at around 17 visible edges producing around 90 children. An "expand everything" affordance would
  break it, and would also break GraphViz.

## Known limitations, and what is planned

- **GraphViz is slated for replacement** by a layout engine such as ELK or Dagre, for large graphs.
- **`vscode-ext` does not yet load `Core.exe` at run time**, so the extension reads the model without the
  .NET component that produced it.

## Consequences worth knowing

These follow from the rules above, and explain some otherwise puzzling code:

- A native module cannot be loaded from inside a packaged application's archive, so `better-sqlite3` is
  unpacked and `sqlio` is given the path of the binding explicitly. See `ELECTRON-APP-BUILD.md`.
- Because the backend is not a package, its folders group by concern rather than by publishable unit. See
  `PACKAGES.md`.