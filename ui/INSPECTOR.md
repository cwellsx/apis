# Inspector

The persistent surface for details: what a node _is_, as opposed to what it is connected to. Deferred —
nothing here is implemented — but the inventory below is what any design has to work from.

## Why a pane, and not a popup

A popup is transient, small and read-only. Details want the opposite: room for a list of calls, a method
body, eventually source with line numbers, and the time to read them. The pane is also where the graph
stops being the answer — once you are reading a method body, it should stay put while you click elsewhere.

The traces of this intent are already in the code: `Layout` accepts a `right` pane which the layout model
never creates; `App` has a commented-out `right` section and a dead `rightWidthMaxContent`, which sized
that pane to its content; and `AppOptions.detailsClosed` with `DetailsType = "app" | "graph"` describes
collapsible sections, one of which is the graph's own.

## What details exist per node type

| Node type          | Available now                                                                                                   | Where it comes from                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Assembly           | name; whether it is a Microsoft assembly; the assemblies it references; counts of namespaces, types and methods | `assemblies`, `references`, counts over `namespaces` / `typeNames` / `members` |
| Namespace or group | full name; its assembly; counts of types and methods                                                            | `namespaces`, `groups`, counts over `typeNames`                                |
| Type               | full name; its namespace and assembly; counts of methods                                                        | `typeNames`, `members`                                                         |
| Method             | full name; its declaring type; the methods it calls and the methods that call it; its decompiled body           | `fullNames`, `calls`, `decompiled.asText`                                      |

Not available: source file and line, base types and interfaces, and field, property and event members. The
first needs Core to emit it. The others are not in the model at all — it has node types for groups,
assemblies, namespaces, types and methods, and nothing else.

## What is worth showing

Nothing is urgent: the graph answers the structural questions and the tree answers the filtering ones. The
two details which would earn their place first are:

1. **In and out calls** for a node, as a navigable list. The graph shows them as edges, but only for nodes
   currently rendered and with abbreviated labels — so a list of full names is new information, and it is
   the textual form of "what calls this", which otherwise costs an expansion and some hunting.
2. **The decompiled body** of a method. It is the reason the tool exists, it is already in the database,
   and there is nowhere else in the UI it could go.

Counts are the cheapest and least interesting, but they are what makes a capped popup list honest.

## How it would be fed

Selection is the missing input: nothing in the UI currently says which node is being inspected. The natural
gestures are a click on a node's label in the tree, and a click on a node in the graph — the latter already
means "open or close", so it would select as well, and the graph would highlight the selected node.

Selection itself can stay in the renderer. Only the details _data_ needs a round trip, and it can be a
request carrying a node id rather than new backend state.

## Shape of the data

Structured data, rendered by the front end — not markdown or HTML from the backend. [MORE/DETAILS.md](../MORE/DETAILS.md)
argues this at length, and proposes a shape: identity, kind, declaring type, signature, parameters, return
type, source location, callers, callees, attributes, modifiers. The `ViewDetails` and `OnDetailEvent`
contracts the old details components referred to are commented out, so the shape would be defined fresh —
for the same reason the popup contracts carry data rather than markup.
