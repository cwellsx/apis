# API Viewer

- Source code is two-dimensional -- files, lines, one method at a time.
- **Interconnections are the third dimension** -- who calls whom.
- Developers build this model in their head -- reading source code.
- **API Viewer builds that model from your code** -- and lets you explore it directly.

_(Add a screenshot here.)_

## What it is

- **An interactive map of the runtime structure** -- call stacks and entry points -- from aggregated overviews
  down to individual calls
- **Always up to date** -- the model is created from your software's build or installation folder
- **Local** -- it reads your assemblies from disk and its model never leaves your machine

## Use cases

- Explore an unfamiliar codebase
- Document or summarise an existing one
- Understand and plan refactoring, or work in progress

## Entry points

- In programs that run to completion, call stacks originate in `Main`
- In long-running processes, `Main` installs event handlers and most call stacks start in them
- In servers, endpoints are event handlers or callbacks that implement a network API

## How it works

It builds a model of the software:

1. **Parses** a build or installation folder
2. **Identifies** code elements -- namespaces, types, methods
3. **Models** them as a tree, with method calls as `from -> to` pairs
4. **Indexes** elements by ID for fast lookup

It shows interactive views:

- Expand groups, hide or select nodes
- Inspect labels, tooltips and details

_(More screenshots here.)_

## Privacy

- Runs locally, with no network connection
- Model data stays on your machine

## 🚧 Work in progress

### Alpha

New UI features are being built, and things will change.

### .NET only

Currently only .NET is supported; other languages may follow later.

### Build from source

It isn't packaged yet. From a source checkout:

```
npm install
npm start -w apis
```

The .NET component and the test commands are described in
[`docs/architecture/TESTING.md`](docs/architecture/TESTING.md).
