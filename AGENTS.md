# AGENTS.md

Guidance for AI coding agents (and humans) working in this repository. For _what_ the project is see
[`README.md`](./README.md); for _how_ it is built see the [architecture documentation](./docs/architecture/README.md) and
[`TESTING.md`](./docs/architecture/TESTING.md).

## How this agent is used

This repo is developed **interactively** with Cline inside a VS Code extension -- a programmer's
assistant used in **Plan** and **Act** mode, with the maintainer in the loop. It is **not** an
unattended ("lights-off") runner. In practice:

- **Testing is the maintainer's job.** Don't run the test suite or the app. After an edit, a
  **type-check** (or at least confirming it compiles) is welcome; deeper verification is not expected.
- **Format what you edit.** `editor.formatOnSave` fires for saves made in the editor, not for edits made by
  the agent's tools, so run `prettier --write` on the files touched -- `--check` after it is redundant.
- **Lint the file, not the repo.** Run `eslint` on the touched file when its path is one the `lint` script
  covers; `npm run lint` as a whole fails for pre-existing, unrelated reasons, so it says nothing about the
  change in hand.
- **Keep changes small.** Most tasks edit a **single file**. Don't write large amounts of code, and
  don't read broadly from the repo or git history on spec -- the maintainer will say when a task needs a
  wider search.
- **Stay in scope** and ask when the intent is unclear, rather than assuming.
- **Reach for a tool before the shell.** Reading, searching, formatting, linting, type-checking and git are all
  tools; every shell command needs the maintainer's approval, and most of what an agent wants is already a tool.
  See [Agent tools](#agent-tools).
- **Resuming or handing off (`/newtask`).** When starting a task read the file in the `wip/` folder, if any.
  And before handing off to a new task mid-feature, update the `wip/` file with completed steps and open decisions.

## Agent tools

`agent/` is an MCP server of what an agent needs most often -- the type-check, the linter, the formatter, git, and
reading and searching files. Everything it offers is allowed in advance, so none of it needs approval:

| Tool                                                                                          | What it does                                                                                       |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `type_check(package)`                                                                         | `npm run type-check -w <package>`, the package being `apis`, `backend-test` or `electron-app-test` |
| `eslint(files)`                                                                               | `eslint` on specific files, which should be paths the `lint` script covers                         |
| `prettier_write(files)`                                                                       | `prettier --write` on specific files                                                               |
| `git_status()`, `git_diff(scope)`, `git_log(count)`                                           | the git state, without the shell                                                                   |
| `git_ignored(paths)`                                                                          | whether git ignores a path, and the rule that does it                                              |
| `read_lines(path, start, end)`, `list_files(dir, pattern)`, `search(pattern, paths, include)` | reading and searching, in node                                                                     |

`read_files` and `search_codebase` are the built-in equivalents and also need no approval; `read_lines` is the
reliable one for a range of lines. Keep the shell for what none of them can do: launching the app,
`build-dotnet`, and inspecting generated data such as `apis.testdata/Core2/appData/core.json`.

The server lives in the repo so that it can find the root as its own parent. Its [README](./agent/README.md) says
how to register it, and it needs restarting after its own source changes.

## Project

**API Viewer** (Electron product `apis`; VS Code extension `sys-view`) is a pre-alpha tool that
reverse-engineers a .NET codebase's **runtime** structure -- call stacks, entry points and call graphs
-- into an interactive, always-current map. It reflects a build/installation folder of assemblies and
renders several views. It runs entirely locally; the model never leaves the machine.

## Repository map

| Path                                      | npm name                         | Role                                                     |
| ----------------------------------------- | -------------------------------- | -------------------------------------------------------- |
| `packages/backend`                        | -- (no `package.json`)           | Most of the logic: model + presentation.                 |
| `packages/backend-dotnet`                 | `backend-dotnet`                 | .NET component (`Core.exe`): reflection + decompilation. |
| `packages/sqlio`                          | `sqlio`                          | Thin wrapper over `better-sqlite3`.                      |
| `packages/backend-test`                   | `backend-test`                   | `electron-mocha` tests for `backend`.                    |
| `packages/electron-app`                   | `apis`                           | Electron + React front end (primary).                    |
| `packages/electron-app-test`              | `electron-app-test`              | `vitest` tests for the renderer.                         |
| `packages/vscode-ext`                     | `sys-view`                       | VS Code extension front end.                             |
| `packages/electron-forge-resource-plugin` | `electron-forge-resource-plugin` | Forge plugin: builds and packages an external resource.  |

`packages/backend` has **no `package.json`** and is **not built on its own** -- it is compiled as part
of `electron-app`, `vscode-ext` and `backend-test`. This is deliberate (see `docs/architecture/CONSTRAINTS.md`).

## Commands

The shell is **Windows PowerShell**. Chain with `;` (never `&&` or `||`); quote paths containing spaces.

Scripts are defined **per package** -- read the relevant `packages/*/package.json` rather than assuming.
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

See [`TESTING.md`](./docs/architecture/TESTING.md) for details.

## Code style

- Prefer **arrow functions** over `function`.
- Prefer **`type`** over `interface`.
- Prefer **closures** over `class`.
- Lint/format: ESLint (`eslint.config.mjs`) and Prettier (`.prettierrc.json`) at the root.

## Git

- **Read-only**: `git status --short`, `git --no-pager diff`, `git --no-pager log -5` are fine.
- **Never change git state** -- do not stage or commit.
- **Staging is expected.** The maintainer stages each step as it is finished and commits once a
  feature (or sequence of steps) is complete, so a staged/unstaged split in `git status` is normal.
  Note that `git --no-pager diff` then shows only the _unstaged_ part -- use `git --no-pager diff HEAD`
  to see the whole picture of a step in progress.
- Always disable paging (`--no-pager`).

## Hard constraints

- Do **not** reflect or decompile Microsoft/.NET platform assemblies.
- **Do not modify anything git does not track.** `node_modules`, `dist`, `out` and `externals` are ignored
  within the repository; so is the test output under `packages/backend-test/generated*`. A change to either
  leaves no trace -- no diff, no revert, and no record that it happened -- so a mistake there is unrecoverable
  and invisible. Build tools and tests write those paths; that is their job, and not an agent's. Ask
  `git_ignored` before deleting or rewriting anything inside the repository, since a recursive delete is how
  this goes wrong.
- Do **not** build `packages/backend` as an independent package.
- Keep `better-sqlite3` (`sqlio`) rebuilt to match Electron's ABI; `electron-app` and `vscode-ext` must
  use the same Electron version.
- `vscode-ext` does not yet load `Core.exe` at run time.

## Plans (`wip/`)

Work that is more than a single edit -- a multi-step change, or one with a design decision, or one that
changes how something works -- starts as a written plan in `wip/`, one file per piece of work, small enough
to review in a sitting. Either of us may draft it; the plan is read and revised by both before the first
edit, not charged through. It is transient: delete it when the work is done -- what the work produced is the
record, and reasoning worth keeping belongs in the document it concerns. While the work is in flight the file
doubles as the handoff note (see the `/newtask` bullet above).

## Documentation

In the root of the repository:

| File         | Contents                                               |
| ------------ | ------------------------------------------------------ |
| `README.md`  | What the project is, for users.                        |
| `AGENTS.md`  | This file -- guidance for AI coding agents.            |
| `ROADMAP.md` | Long-term plan.                                        |
| `TODO.md`    | Short-term plan (maintainer's scratch -- do not edit). |

Everything else lives under `docs/`, one folder per area -- `architecture` and `ui` -- and
`docs/architecture/README.md` is the index: the documents, and the question each one answers. **That index is
the source of truth for what is in the folder**, so this file does not repeat it.

The `docs` folder is maintained by hand as the code changes, and an agent is welcome to add to it and keep it
current: a change that alters how something works should update the document that describes it, in the same
commit. The files in the root are the maintainer's -- this one included -- and an agent should ask before
changing them.

Identifiers in these documents -- file, folder and symbol names -- are meant to lead a reader into the code, so
a stale one is worse than none. Renaming something therefore means finding its references in the documentation
as well as in the code, with the same find-in-files.

Prose in these files is written in ASCII: an em dash is two hyphens (`--`), an en dash a single hyphen (`-`),
an ellipsis three dots (`...`), and a flow arrow `->` (or `<->` for a two-way connection) -- never the
`—`, `–`, `…`, `→` characters, and never curly quotes (`'`, `"`). So the text stays easy to type and the
diffs stay clean.
