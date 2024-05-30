# API Viewer

## What

This lets you browse the APIs of .NET solutions:

- Reads your .NET assemblies, using Reflection
- Graphs your APIs, between and within assemblies
- Interactive UI to customize the graph you're viewing:
  - Cluster nodes into groups
  - Hide and show nodes
  - Labels and tooltips
  - Click on nodes and connectors to view details

## Why

Using a graph, instead of text, shows everything on one page:

- The architecture -- the "structure" or shape of the software
- Any details
- Things you couldn't search for, because you didn't know that they existed
- Interactive, to avoid too much, or too little, or the wrong details

Using reflection reverse-engineers your actual, current software architecture:

- Automatically evolves, it's "documentation" which doesn't become outdated
- Not just an "idea" of the architecture, which might not be implemented exactly like that
- One-to-one mapping between the graphical architecture and the source code
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
