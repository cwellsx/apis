---
title: User interface
nav_order: 4
layout: home
---

# User interface

See also the [README](../README.md) which introduces:

- What this application does
- Why it's useful

The user interface elements are:

- [File (menu items)](#file-menu-items)
  - [`Directory containing binary .NET assemblies`](#directory-containing-binary-net-assemblies)
  - [`JSON file containing id and dependencies`](#json-file-containing-id-and-dependencies)
  - [`Core.json file created by running Core.exe`](#corejson-file-created-by-running-coreexe)
- [View (menu items)](#view-menu-items)
  - [`References`](#references)
  - [`APIs`](#apis)
  - [`Custom`](#custom)
  - [`Errors`](#errors)
- [Rescaling with the mouse wheel](#rescaling-with-the-mouse-wheel)
- [Graphviz](#graphviz)
- [View options](#view-options)
  - [`Groups as subgraphs`](#groups-as-subgraphs)
  - [`Show edge labels`](#show-edge-labels)
  - [`Show intra-assembly calls`](#show-intra-assembly-calls)
- [Node visibility](#node-visibility)
  - [Using the tree of nodes in the left pane](#using-the-tree-of-nodes-in-the-left-pane)
  - [Clicking on nodes and clusters in the graph](#clicking-on-nodes-and-clusters-in-the-graph)
- [`.NET` and `3rd-party` groups](#net-and-3rd-party-groups)
  - [`.NET`](#net)
  - [`3rd-party`](#3rd-party)
- [Details](#details)
  - [References -- assembly details](#references----assembly-details)
  - [References -- synthetic call stack](#references----synthetic-call-stack)
  - [Call stack -- source code](#call-stack----source-code)
- [Problems](#problems)
  - [Loading a data source is slow](#loading-a-data-source-is-slow)
  - [Changing view options is slow](#changing-view-options-is-slow)
  - [There's an exception at run-time](#theres-an-exception-at-run-time)
  - [The Errors view is non-empty](#the-errors-view-is-non-empty)

## File (menu items)

Use the File menu to select the data source you want to view.

- The application reads the data source (which is slow, i.e. a few seconds per assembly)
- It stores the reflected data into an internal SQLite database
- The data subsequently comes from SQLite, which is much faster (less than a second total)

When you reopen the application:

- It reopens the same data source as before (from SQLite).
- Or you can open a different data source instead.

Beneath the standard menu items is a list of the data sources (i.e. paths) which you have opened.

The data is reloaded from the data source, instead from the SQLite cache:

- If the data source is updated, i.e. if the date of a file-on-disk is newer than the date of the SQLite cache
- If you edit the `schemaVersion` or the `alwaysReload` option, in the application source code

![alt text](./screenshots.tiny/Screenshot%202024-05-29%20225134.png)

### `Directory containing binary .NET assemblies`

Use this to select a directory which contains .NET assemblies, for example:

- The `bin\*` directory which contains the results of a project's or a solution's build
- Or an installation directory, which contains installed assemblies

The tool will then read from (i.e. disassemble) these assemblies, using the .NET Reflection APIs.

TO DO: A future version may implement a progress indicator and a Cancel button

### `JSON file containing id and dependencies`

Use this to select a JSON file, which contains the data to display.

Creating this file is out-of-scope -- you may create it manually.
The purpose of this feature is to let you:

- Define an architecture which doesn't exist yet (i.e. which hasn't been coded)
- Then display your definition using this application's interactive graphs:

  - Cluster nodes (grouped by custom "layers")
  - Zoom in and out of clusters
  - Show and hide nodes and clusters
  - Labels and/or tooltips on connectors
  - Automatic graph layout

The format of your JSON file must be as follows:

- An array of nodes, where every node is an object with the following properties:
  - `id` required, must be unique
  - `label` optional, default is the `id` value
  - `tags` optional, an array of strings
  - `dependencies` required, an array of objects with required `id` and `label` fields
- Any node or dependency may have other optional named properties, whose type is one of `string`, `number`, or `boolean`

This data format is defined with TypeScript, in this source file:

- [`src/main/customJson.ts`](../src/main/customJson.ts)

### `Core.json file created by running Core.exe`

`Core.exe` is the program which load and reads .NET assemblies via the Reflection API.

This program is usually run automatically/transparently (via the first option on the File menu).

- You can also run this program from the command-line (i.e. without the Electron application)
- If so then it will create a `Core.json` data file
- You can copy this data file, and load it into Electron, using this third File menu item

## View (menu items)

After a data source is opened and data is loaded, the View menu offers different ways to view it.

### `References`

This view was the easiest to implement (and perhaps least useful for you).

It shows the dependencies obtained via the `Assembly.GetReferencedAssemblies()` API,
i.e. which are defined as project and package references in the `*.csproj`.

![Alt text](./screenshots.tiny/Screenshot%202024-05-30%20081413.png)

As an example, this is showing the dependencies of the `Core.exe` program:

### `APIs`

The APIs view is more interesting and a reason why I developed this application.

It explains (among other things) the inter-assembly architecture.

It shows not only that there is an assembly reference, but also why -- i.e., which are the public methods being called.

This example diagram shows, that the `Program` type (in the `Core` assembly)
calls methods of the types named `Connection` and `ConnectionBuilder` (in the `ElectronCGI.DotNet` assembly):

![Alt text](./screenshots.tiny/Screenshot%202024-05-30%20082901.png)

The labels show the names of the called types or methods:

- Types, if the connection is to the target assembly -- when the assembly is not expanded and therefore hides its types
- Methods, if the connection is to the target type -- when the assembly is expanded and therefore exposes its types

This diagram shows the target assembly opened (and other 3rd-party assemblies hidden)
-- now you can see the names of the methods being called, for each type:

![Alt text](./screenshots.tiny/Screenshot%202024-05-30%20135130.png)

### `Custom`

This is the view displayed when you use the second File menu item to load your own, hand-written, custom JSON data.

I won't show an example here.

### `Errors`

If there are any errors when loading (reflecting and decompiling) from the data source,
then there's an Errors menu item in the View menu.

## Rescaling with the mouse wheel

You can resize the graph (in the central pane) and the text (in the left and right panes), using the mouse wheel:

- Mouse wheel in the central pane to resize the graph
- `[Ctrl]` key and mouse wheel in the left-hand pane to resize the text

Screenshots on this page use text size `12px` (instead of the default `16px`), and graph size `45%` (instead of `100%`).

## Graphviz

The image is created using Graphviz (which tries to optimize the layout of the graph)

Graphviz also produces an image map, so the elements (i.e. nodes and edges) react to `onClick` and `onHover` events

## View options

Depending on the View (above), there are different view Options available.

### `Groups as subgraphs`

This option is available on the References view.

It's shown disabled in the screenshot above.

If you enable it then:

- Nodes are grouped into clusters
- Node names are shortened

![Alt text](./screenshots.tiny/Screenshot%202024-05-30%20085125.png)

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

### `Show edge labels`

The screenshots of the APIs views above show labels on the connectors.

But having labels is too much, on larger graphs with dozens or more nodes --
even if you wanted them, they make the graph too large and interfere with the layout of the nodes.

Therefore, there's an option to disable the labels:

- The can still see labels as a tooltip, if you hover with the mouse
- Showing labels on a graph might be especially useful if you're making static screenshots

In fact there are two options to show labels:

- `Grouped edges` -- connectors to assemblies (i.e. to groups of types), which show the target type names
- `Leaf edges` -- connects to types (i.e. when an assembly is expanded), which show the target method names

### `Show intra-assembly calls`

This option lets you show or hide the calls within an assembly.

Disable this to only show the calls between assemblies (as shown in the previous APIs screenshots above).

- Disable to understand the "public" APIs, between a group of assemblies
- Enable to understand the "internal APIs, within a single assembly

One is to understand a single assembly, the other is to understand a group of assemblies.

![Alt text](./screenshots.tiny/Screenshot%202024-05-30%20202038.png)

TO DO:

- Add a namespace to the `Output.cs` and `OutputEx.cs` files in the `Core.exe` source code
- Add a View option to cluster types by their namespace, within an assembly or instead of by assembly
- Add a View option to hide `.ctor` calls which only construct a type without calling any other of its methods

## Node visibility

### Using the tree of nodes in the left pane

Below the view options on the left pane is a tree of all the nodes:

- Visible nodes (shown with checkbox enable)
- Invisible nodes (show with checkbox disabled)
- Clusters (shown as parent nodes)

Note:

- Expanding or collapsing a parent node does the same to the corresponding cluster on the graph
  (unless the `Group as subgraphs` option is disabled)
- Toggle the visibility of a parent node to toggle the visibility of all its child nodes
- The `+` and `-` icons lets you expand or collapse every parent node in the tree

### Clicking on nodes and clusters in the graph

Clusters:

- When you hover over a cluster in the graph, its outline is highlighted in red.
- Click on it, to expand if its currently collapsed, or to collapse if its currently expanded
- This is the same as (therefore an alternative to) expanding and collapsing parents in the tree

Leaf nodes:

- When you hover over a leaf in the graph, its outline is highlighted in green or blue.
- Use `[Ctrl]`-click to hide it
- This is the same as disabling its checkbox in the tree

  TO DO:

  - Make this work on the APIs view not only on the References view
  - Fix the cursor not changing when the `[Ctrl]` key is pressed
  - Implement blue instead of red for leaf nodes without detail (i.e. which are not green)

## `.NET` and `3rd-party` groups

Two groups of assemblies are created automatically, named `.NET` and `3rd-party`.

### `.NET`

The `.NET` group is for all the `Microsoft.*` and `System.*` and similar assemblies.

I assume you already know the .NET API and are not especially interested in seeing where it's used.

- The application doesn't disassemble .NET assemblies
- The APIs view ignores (doesn't show) calls to .NET types

### `3rd-party`

When it scans a data source, the application notes the names of any `*.exe`:

- These are assumed to be "your application"
- Other assemblies with a similar name are assumed to be "yours" as well.

For example, `Core.IL.dll` is assumed to be from the same manufacturer as `Core.exe`.

Other assemblies are assumed to be `3rd-party`:

- If they are not similar to the name of the application
- And if they are not `.NET` assemblies

Unlike `.NET` assemblies, these are decompiled and calls to them are recorded and optionally shown.

Classifying them into a grouped named `3rd-party` is just a guess and a convenience,
e.g. so that you can show or hide all these as one cluster.

- The `3rd-party` group is for all the assemblies whose names are not similar to the name of the `*.exe` in the assembly

## Details

Depending on the type of view, there may see further details, by clicking on leaf node or a connector.

If a leaf node or connector has a green outline, when you hover with a mouse, that means details are available if you click it.

The details are typically shown in a pane to the right of the graph:

- View menu -- select the view type
- Left pane -- view options and node visibility
- Middle pane -- the graph
- Right pane -- details after clicking on the graph

### References -- assembly details

When you click on an assembly in the References view, the details are everything in that assembly:

- This is a conventional tree of all the namespaces, types, and members.
- It's similar to what you see in the Solution Explorer of Visual Studio, or when you run ILSpy.

![Alt text](./screenshots.tiny/Screenshot%202024-05-30%20221107.png)

TO DO:

- Hide compiler-generated backing field

### References -- synthetic call stack

If you click on any method in the type details above, it shows a tree of all possible call stacks which include the selected method.

For example, this is the result of clicking on the AssemblyReader.Add method:

- It's only called from `MethodReader.LoadAssemblies`, which in turn is called from `Program.Main`
- It calls `GetAssemblyName` and something in the `MethodReader` type, which can be expanded in turn

![Alt text](./screenshots.tiny/Screenshot%202024-05-30%20222207.png)

I call this a "synthetic call stack" -- because it is the call stack, calculated (synthesized) at design-time, instead of captured at run-time.

This view was the original reason why I wrote this application:

- When I'm working with a method in a large or unknown code-base, I want to know, "Where is this method called from?", as well as, "What does it call as subroutines?"
- Answering this question is difficult (i.e. time-consuming and distracting) to discover manually, especially up or down many levels, and especially across multiple assemblies

TO DO:

- Hide compiler-generated types, like they're already removed from the APIs view
- Define view options for this view, e.g. to show the labels on the graph instead of only as tooltips
- Reconsider how this is displayed in a secondary window:
  - Consider a new tabbed window instead
  - Don't display the main File and View menus on it
- When a node is removed i.e. hidden, also hide other nodes (i.e. the whole subtree) which are no longer reachable from the method in question

### Call stack -- source code

When a synthetic call stack is displayed, you can click on any method in the stack to show the associated source code --
and so you can browse source code, up and down the call stack, by clicking on different methods in the graph.

![Alt text](./screenshots.tiny/Screenshot%202024-05-30%20225010.png)

TO DO:

- Reduce the tab size
- Implement some line wrap, to avoid too-long lines
- Review the decompilation options re. generated source code
- Try some highlighting, maybe using a simple "find whole word", to identify the line-of-code or method-name on the stack
- Maybe consider how to integrate with source code, on the local machine or a remote repository

## Problems

### Loading a data source is slow

Yes on my machine it takes a few seconds per assembly.

It's disassembling everything, so it's like compiling, it takes seconds.

Bug after that's done once, loading data from SQLite seems very quick, less than a second, even for a lot of data.

TO DO:

- Implement a progress indicator when it's reflecting assemblies

### Changing view options is slow

Regenerating the graph may take seconds, when you change the view options.

It's Graphviz which takes the time, so perhaps I can do nothing about that.

All the data processing in `src/main` (apart from running Graphviz) is quick even if it's synchronous.

- The time it take Graphviz seems closely related to the number of elements on the graph.
- Nodes which are hidden (either invisible, or inside a non-expanded group) take no time.
- A graph with too many dozen of elements might not be readable anyway
- So you can minimize time, by using this application's filtering to keep the graphs relatively small

### There's an exception at run-time

Oops.

That's obviously an Issue to be reported and/or fixed.

### The Errors view is non-empty

There may be errors or warnings in Core.exe when it loads a code-base.

Hopefully at least most of the code will load without error.
