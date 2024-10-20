---
title: View options
nav_order: 4
layout: home
parent: User interface
---

# View options
{: .no_toc }

Depending on which [View menu](./VIEW.md) item is selected, different Options are available.

- TOC
{:toc}

## `Groups as subgraphs`

This option is available on the References view.

It's shown disabled in the screenshot above.

If you enable it then:

- Nodes are grouped into clusters
- Node names are shortened

![Alt text](../screenshots.tiny/Screenshot%202024-05-30%20085125.png)

For example, instead of two separate assemblies named `Core` and `Core.IL`, there is now a cluster:

- The cluster is named `Core`
- Its children are named `*` and `*.IL`

  Hovering with the mouse will show the full name as a tooltip, for example
  to see that `*` is `Core` and `*.IL` is `Core.IL`.

The illustration is a small ("toy") example --
but this application lets you browse a solution with 100s of assemblies, and that's why this feature exists:

- To group similar/related assemblies (i.e. into what Graphviz calls a "cluster")
- To shorten the names of assemblies (which are otherwise too wide on a graph)

This feature is always enabled (i.e. it's not an option) on the APIs view -- where even an example like the `Core.exe`
assembly contains 30 different types (classes), which it's overwhelming (useless) to display on a graph.

## `Show edge labels`

The screenshots of the APIs views above show labels on the connectors.

But having labels is too much, on larger graphs with dozens or more nodes --
even if you wanted them, they make the graph too large and interfere with the layout of the nodes.

Therefore, there's an option to disable the labels:

- The can still see labels as a tooltip, if you hover with the mouse
- Showing labels on a graph might be especially useful if you're making static screenshots

In fact there are two options to show labels:

- `Grouped edges` -- connectors to assemblies (i.e. to groups of types), which show the target type names
- `Leaf edges` -- connects to types (i.e. when an assembly is expanded), which show the target method names

## `Show intra-assembly calls`

This option lets you show or hide the calls within an assembly.

Disable this to only show the calls between assemblies (as shown in the previous APIs screenshots above).

- Disable to understand the "public" APIs, between a group of assemblies
- Enable to understand the "internal APIs, within a single assembly

One is to understand a single assembly, the other is to understand a group of assemblies.

![Alt text](../screenshots.tiny/Screenshot%202024-05-30%20202038.png)

TO DO:

- Add a namespace to the `Output.cs` and `OutputEx.cs` files in the `Core.exe` source code
- Add a View option to cluster types by their namespace, within an assembly or instead of by assembly
- Add a View option to hide `.ctor` calls which only construct a type without calling any other of its methods
