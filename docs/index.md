---
title: README
nav_order: 1
layout: home
---

# API Viewer

## What

Browse the APIs of .NET solutions:

- Read .NET assemblies using Reflection
- Graph APIs between or within assemblies

UI to customize the graph view:

- Cluster nodes into groups
- Hide and show nodes
- Labels and tooltips
- Click on nodes and connectors to view details

## Why

The graph shows both the architecture and its details.

The display is interactive:

- See the top-level architecture
- Drill down to specific details
- Extract data e.g. call graphs

Reflection reverse-engineers your actual, current software architecture:

- Automatically evolves, it's "documentation" which doesn't become outdated
- Truthful, one-to-one mapping between the graphical architecture and the source code
- Decompiles everything, including assemblies which are packaged from other repositories

<!-- Decompiling all method bodies:

- Therefore it knows where every method is called from
- So it can show a tree of synthetic call stacks for any method:
  - From where is it called?
  - What are its subroutines?
  - Not just for one level but for all, top to bottom, another interactive graph -->

## How

For details, see:

- [Installation](./docs/INSTALLATION.md)
- [User interface](./docs/USER.md)
- [Code design](./docs/DESIGN.md)

## More

This is a pre-release version:

- [To do](./TODO.md)
