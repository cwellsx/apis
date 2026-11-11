# AGENTS.md

Guidance for AI coding agents (and humans) working in this repository. For _what_ the project is see
[`README.md`](./README.md); for _how_ it is built see [`ARCHITECTURE.md`](./ARCHITECTURE.md) and
[`TESTING.md`](./TESTING.md).

## How this agent is used

This repo is developed **interactively** with Cline inside a VS Code extension — a programmer's
assistant used in **Plan** and **Act** mode, with the maintainer in the loop. It is **not** an
unattended ("lights-off") runner. In practice:

- **Testing is the maintainer's job.** Don't run the test suite or the app. After an edit, a
  **type-check** (or at least confirming it compiles) is welcome; deeper verification is not expected.
- **Keep changes small.** Most tasks edit a **single file**. Don't write large amounts of code, and
  don't read broadly from the repo or git history on spec — the maintainer will say when a task needs a
  wider search.
- **Stay in scope** and ask when the intent is unclear, rather than assuming.

## Project

**API Viewer** (Electron product `apis`; VS Code extension `sys-view`) is a pre-alpha tool that
reverse-engineers a .NET codebase's **runtime** structure — call stacks, entry points and call graphs
— into an interactive, always-current map. It reflects a build/installation folder of assemblies and
renders several views. It runs entirely locally; the model never leaves the machine.

## Repository map

| Path                         | npm name              | Role                                                     |
| ---------------------------- | --------------------- | -------------------------------------------------------- |
| `packages/backend`           | — (no `package.json`) | Most of the logic: model + presentation.                 |
| `packages/backend-dotnet`    | `backend-dotnet`      | .NET component (`Core.exe`): reflection + decompilation. |
| `packages/sqlio`             | `sqlio`               | Thin wrapper over `better-sqlite3`.                      |
| `packages/backend-test`      | `backend-test`        | `electron-mocha` tests for `backend`.                    |
| `packages/electron-app`      | `apis`                | Electron + React front end (primary).                    |
| `packages/electron-app-test` | `electron-app-test`   | `vitest` tests for the renderer.                         |
| `packages/vscode-ext`        | `sys-view`            | VS Code extension front end.                             |

`packages/backend` has **no `package.json`** and is **not built on its own** — it is compiled as part
of `electron-app`, `vscode-ext` and `backend-test`. This is deliberate (see `ARCHITECTURE.md`).

## Commands

The shell is **Windows PowerShell**. Chain with `;` (never `&&` or `||`); quote paths containing spaces.

Scripts are defined **per package** — read the relevant `packages/*/package.json` rather than assuming.
Run a script from the repo root with `-w`:

```powershell
npm run type-check -w apis       # electron-app
npm test -w backend-test         # backend tests
```

The few canonical entry points:

| Task                    | Command                         |
| ----------------------- | ------------------------------- |
| Type-check a package    | `npm run type-check -w <name>`  |
| Backend tests           | `npm test -w backend-test`      |
| Renderer tests          | `npm test -w electron-app-test` |
| Launch the Electron app | `npm start -w apis`             |

See [`TESTING.md`](./TESTING.md) for details.

## Code style

- Prefer **arrow functions** over `function`.
- Prefer **`type`** over `interface`.
- Prefer **closures** over `class`.
- Lint/format: ESLint (`eslint.config.mjs`) and Prettier (`.prettierrc.json`) at the root.

## Git

- **Read-only**: `git status --short`, `git --no-pager diff`, `git --no-pager log -5` are fine.
- **Never change git state** — do not stage or commit.
- **Staging is expected.** The maintainer stages each step as it is finished and commits once a
  feature (or sequence of steps) is complete, so a staged/unstaged split in `git status` is normal.
  Note that `git --no-pager diff` then shows only the _unstaged_ part — use `git --no-pager diff HEAD`
  to see the whole picture of a step in progress.
- Always disable paging (`--no-pager`).

## Hard constraints

- Do **not** reflect or decompile Microsoft/.NET platform assemblies.
- Do **not** build `packages/backend` as an independent package.
- Keep `better-sqlite3` (`sqlio`) rebuilt to match Electron's ABI; `electron-app` and `vscode-ext` must
  use the same Electron version.
- `vscode-ext` does not yet load `Core.exe` at run time.

## Documentation map

| File              | Contents                                              |
| ----------------- | ----------------------------------------------------- |
| `ui/*.md`         | UI design.                                            |
| `README.md`       | What the project is (for humans).                     |
| `ARCHITECTURE.md` | Structure, layering, data flow, key modules.          |
| `TESTING.md`      | How to build, run and validate.                       |
| `ROADMAP.md`      | Long-term plan.                                       |
| `TODO.md`         | Short-term plan (maintainer's scratch — do not edit). |
