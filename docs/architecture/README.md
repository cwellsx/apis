# Architecture

The map of this documentation. Each document answers one question, and they are listed in the order someone
new to the codebase might read them. The groups are subjects, not artefacts.

## Overview

### [PACKAGES.md](./PACKAGES.md)

- > Where does something live?
- One paragraph per package, pointing at the detail.

### [DATA-FLOW.md](./DATA-FLOW.md)

- > Where does the data come from, where does it go, and how is it used?
- The two flows, the aggregations on the way in, and what the roll-up guarantees.

### [DATA-MODEL.md](./DATA-MODEL.md)

- > What is the data?
- The model `Core.exe` produces: metadata tokens, compiler-generated types, platform assemblies, custom data.

### [INTERFACES.md](./INTERFACES.md)

- > How are the packages linked, and what is the API between them?
- The links _between_ packages — the contracts, and the folder each one lives in.

## Backend

### [BACKEND.md](./BACKEND.md)

- > How is the backend arranged inside itself?
- The structure inside the package: its folders, and how they depend on one another.

### [VIEW-STATE.md](./VIEW-STATE.md)

- > How is a view built?
- The forest, the state each node carries, the clustering, and the popup.

## Electron app

### [ELECTRON-APP.md](./ELECTRON-APP.md)

- > How is the app arranged, and what does it do locally?
- The app's two halves, the IPC between them, and what is done locally rather than asked for.

### [ELECTRON-APP-BUILD.md](./ELECTRON-APP-BUILD.md)

- > How do I build, run or package it?
- The build and packaging pipeline, and the Forge plugins that take part in it.

## Contributing

### [AUDIT.md](./AUDIT.md)

- > What do I do about vulnerabilities?
- The policy for evaluating them, the npm commands, and where the current findings are.

### [CONSTRAINTS.md](./CONSTRAINTS.md)

- > What must I not break?
- The rules the software obeys, the assumptions the design rests on, and what follows from them.

### [DOCUMENTATION.md](./DOCUMENTATION.md)

- > How is this documentation written and maintained?
- What it is for, how it is divided, and the conventions that have earned their place.

### [TESTING.md](./TESTING.md)

- > How do I validate a change?
- How to build, run and test, and what the tests cover.

## See also

- [README.md](../../README.md) — what the project is, for users.
- [AGENTS.md](../../AGENTS.md) — how to work in this repository, for agents.
- [ui/README.md](../ui/README.md) — how the interface looks and behaves.
- [ROADMAP.md](../../ROADMAP.md) and [TODO.md](../../TODO.md) — the maintainer's own plans.
