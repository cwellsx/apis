# API Viewer

**Inspect a codebase’s runtime structure:**

- Views include call stacks and entry points.
- Use it to explore a codebase architecture, and to guide refactoring.
- It's an interactive, always‑current map of your code that complements source and design docs.

**Status:** Pre‑alpha.

## What you'll see

### Call stacks

Source files are two-dimensional and static; they show lines of code contained in methods, types, and packages.

Call stacks add the runtime dimension. They show:

- **Why** an API exists
- **How** it is implemented (calls to subroutines)
- **Context**: what calls an API
- **Connections**: where components are linked

API Viewer makes the map of callers and callees explicit.

### Entry points

- In programs that run to completion -- call stacks originate in `Main`.
- In long‑running processes -- `Main` instantiates event handlers, and most call stacks start in those handlers.
- In network processes -- endpoints are event handlers or callback functions, which implement a network API.

## How it's implemented

### Model

It builds a model of the software:

1. **Parses** software in a build or installation folder.
2. **Tokenizes** code elements: packages, namespaces, types, methods.
3. **Models** the software as a token tree; method calls are token pairs (`from → to`).
4. **Indexes** tokens by ID for fast lookup.

### Views

The UI renders multiple view types from the model:

- Expand groups, hide or select nodes
- Open multiple windows
- Inspect labels, tooltips, and details

## Use cases

- Explore a new codebase
- Document or summarize an existing codebase
- Refactor or analyze work in progress

## Advantages over traditional documentation

- **Interactive**
- **High‑level and code‑level** views
- **Always up‑to‑date** — one‑to‑one mapping with source

## Privacy

- API Viewer runs locally.
- Model data stays on your machine.
- No network connection is used.

## Notes

<details><summary>Status ⛔</summary>

Pre‑alpha: incomplete and unreleased.

</details>

<details><summary>Documentation ⛔</summary>

Documents -- `*.md` files -- are old, unfinished, unreliable.

Only this README and the [ROADMAP](./ROADMAP.md) are maintained recently.

</details>

<details><summary>Languages</summary>

Current version supports **.NET** only.
Other languages (for example TypeScript) may be added later.

</details>
<details><summary>Implementation</summary>

- Parsing -- System.Reflection and ILSpy
- Storage -- SQLite
- Graphic -- GraphViz
- Packaged -- a VS Code extension; or a standalone Electron app

</details>
