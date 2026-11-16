# API Viewer

**Interactive views of software's runtime structure:**

Use it to inspect or discover design, and guide refactoring.

- Views include the call stacks and entry points.
- See an overview and select details to reveal.

This is interactive and up-to-date, a map that complements source code and design docs.

## Views

### Call stacks

Source code is static and two-dimensional -- listings, lines of code in source files.

Interconnections are the third dimension -- callers and callees:

- **What** each API is -- the content
- **How** it's implemented -- calls to subroutines
- **Context** -- what calls an API
- **Connections** -- where components are linked

The APIs, callers, and implementation of each component are **why** each API exists.

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
- **High-level and code‑level** views
- **Always up-to-date** — one‑to‑one mapping with source

## Privacy

- API Viewer runs locally.
- Model data stays on your machine.
- No network connection is used.

## Notes

<details><summary>Status</summary>

- Alpha -- work in progress
- New UI features being implemented

</details>

<details><summary>Documentation</summary>

- Documents -- `*.md` files -- are a work-in-progress too
- There are software design documents
- No user documents before the UI is completed

</details>

<details><summary>Languages</summary>

- Current version supports **.NET** only.
- Other languages e.g TypeScript may be added later.

</details>

<details><summary>Implementation</summary>

Packaging

- Standalone Electron app
- VS Code extension later

I/O

- No network I/O at all
- Read your software from disk (from the folder you select)
- Read and write its model data in its SQLite

3rd-party components

- Parsing -- Mono.Cecil
- Storage -- SQLite
- Graphic -- GraphViz

</details>
