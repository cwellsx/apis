# API Viewer

## What

This lets you browse the APIs of .NET solutions:

- Reads your .NET assemblies, using Reflection
- Graphs your APIs, between and within assemblies

Its UI lets you customize the view:

- Cluster nodes into groups
- Hide and show nodes
- Labels and tooltips
- Click on nodes and connectors to view details

## Why

The graph shows everything on one page -- both, the architecture and its details.

Because the display is interactive you can:

- See the top-level architecture
- Drill down to specific details
- Extract data e.g. call graphs

So it doesn't have the usual problem of a graphical view -- i.e. showing too much, too little, or the wrong details.

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
