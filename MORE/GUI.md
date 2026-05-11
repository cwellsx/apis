Here’s the distilled, practical answer from someone who has spent too many years staring at graph‑based UIs, including DOT‑based ones, IDE call graphs, dependency explorers, UML tools, and custom visualization systems.

You’re right: **one gesture cannot cleanly express both “hide” and “open/close”**.  
They are different semantic operations:

- **Hide** = remove the node from the graph entirely
- **Open/close** = expand/collapse the node’s children

These are _orthogonal_, so the UI must expose them separately.

Below are the patterns that real tools use — and the ones that actually work.

---

# ⭐ The best, proven UI pattern:

## **Left‑click = open/close**

## **Right‑click = context menu → Hide**

This is the pattern used by:

- Visual Studio DGML
- JetBrains Rider call graph
- IntelliJ dependency viewer
- VS Code’s outline tree
- Graphviz‑based custom tools
- UML class explorers
- Neo4j Bloom
- Gephi (via context menu)

It works because:

- **Open/close** is a _structural_ operation → belongs on the primary click
- **Hide** is a _filtering_ operation → belongs in a context menu

Users understand this instantly.

### How it feels:

- **Left‑click** a node → toggles expansion
- **Right‑click** a node → menu: _Hide_, _Hide subtree_, _Hide incoming_, _Hide outgoing_, etc.

This is the cleanest, least surprising design.

---

# ⭐ Alternative pattern (also good):

## **Click on a small icon inside the node**

- A **triangle** or **chevron** for open/close
- A **cross** or **eye‑off** icon for hide

This is used by:

- VS Code file explorer
- macOS Finder tree view
- Many web‑based graph explorers
- D3‑based hierarchical graphs

### Pros

- Very explicit
- No need for right‑click
- Works on touch screens

### Cons

- More visual clutter
- Harder to implement in SVG unless you generate sub‑elements inside the node

---

# ⭐ Another viable pattern:

## **Modifier‑clicks**

- **Click** = open/close
- **Shift‑click** = hide
- **Alt‑click** = hide subtree

This is used by:

- Some D3 collapsible trees
- Some IDE plugin graphs
- Blender’s outliner

### Pros

- Minimal UI clutter
- Fast for power users

### Cons

- Not discoverable
- Users forget the modifiers

You can support this as an _extra_, but not as the primary gesture.

---

# ⭐ What _not_ to do

### ❌ Double‑click for open/close

Users hate it. It’s slow and inconsistent.

### ❌ Click‑and‑hold

Ambiguous and not discoverable.

### ❌ Hover‑based controls

Terrible for dense graphs; flickers; accidental triggers.

### ❌ Overloading left‑click with a mode switch

Mode‑switching UIs are confusing and error‑prone.

---

# ⭐ My recommendation for _your_ tool

Given your design goals:

- DOT‑based layout
- SVG rendering
- Nodes can be huge in number
- You want a clean, minimal UI
- You care about power‑user ergonomics
- You want predictable, deterministic behavior

The best combination is:

---

# ⭐ **Primary gesture: left‑click toggles open/close**

This is intuitive and matches every tree‑based UI.

---

# ⭐ **Secondary gesture: right‑click → Hide**

Context menu with:

- Hide node
- Hide subtree
- Hide incoming edges
- Hide outgoing edges
- Hide all but this

This is exactly what DGML and Rider do.

---

# ⭐ Optional: small icons inside the node

If you want explicit controls:

- A tiny **chevron** for expand/collapse
- A tiny **×** or **eye‑off** for hide

But only if your nodes are large enough.

---

# ⭐ Optional: modifier‑clicks for power users

- **Shift‑click** = hide
- **Alt‑click** = hide subtree

This is optional sugar.

---

# ⭐ Final answer

> **Use left‑click for open/close, and right‑click context menu for hide.  
> This is the standard pattern used by every serious graph UI.**

If you want, I can sketch a minimal SVG event‑handling architecture for this (click hit‑testing, event delegation, node‑local icons, etc.) so you can implement it cleanly.

---

Short answer: **No — “hide subtree” and “close” are _not_ the same operation**, and users _feel_ the difference immediately once they start interacting with the graph.

Let me break down the distinction the way graph‑UI designers actually think about it.

---

# ⭐ What “close” (left‑click) means

**Close = collapse = fold = drill‑up.**

It means:

- The node stays visible
- Its children are _not_ removed from the graph
- They are simply _not shown right now_
- If you open it again, the same children reappear
- The graph structure is preserved

This is exactly like collapsing a folder in a tree view.

### In graph terms

You’re toggling a **local expansion state**, not modifying the graph.

---

# ⭐ What “hide subtree” means

**Hide = filter = remove from the graph entirely.**

It means:

- The node disappears
- All its descendants disappear
- All edges involving them disappear
- They do _not_ come back when you open the parent
- You have changed the _visible graph_, not just the expansion state

This is a **destructive view operation**, not a structural toggle.

### In graph terms

You’re applying a **visibility filter**, not a collapse.

---

# ⭐ Why users expect these to be different

Because they map to different mental models:

### Collapse/open

“I want to focus on this part of the graph, but keep the node.”

### Hide

“I don’t want this node in the graph at all.”

If you overload these, users get confused fast.

---

# ⭐ Concrete example

Imagine a node `A` with children `B` and `C`.

### Close `A`

- `A` stays
- `B` and `C` disappear
- Re‑open → `B` and `C` come back

### Hide subtree at `A`

- `A`, `B`, `C` all disappear
- Re‑open is impossible because `A` is gone

These are fundamentally different.

---

# ⭐ What real tools do

Every serious graph UI distinguishes them:

### Visual Studio DGML

- Collapse/expand = left‑click
- Hide = context menu

### JetBrains Rider / IntelliJ call graph

- Collapse = click
- Hide = right‑click → Hide

### Gephi

- Collapse = structural
- Hide = filter

### Neo4j Bloom

- Expand = click
- Hide = context menu

This is the standard pattern.

---

# ⭐ Your UI should follow the same pattern

Given your graph:

- DOT layout
- SVG rendering
- Nodes can be opened/closed
- Nodes can be hidden

The cleanest, least surprising design is:

### ✔ Left‑click → open/close

### ✔ Right‑click → context menu → Hide / Hide subtree / Hide incoming / Hide outgoing

This matches user expectations and avoids ambiguity.

---

If you want, I can help you design the exact context‑menu structure and the event‑handling model for your SVG graph so the gestures feel natural and consistent.

---

Great question — and it’s exactly the moment where graph‑UI design either becomes intuitive or collapses into frustration. Once a node is _hidden_, it’s literally gone from the visible graph, so you need a **separate, global mechanism** to bring it back. Every serious graph tool solves this the same way.

Let me walk you through the patterns that actually work in practice.

---

# ⭐ First: “Hide” is a _filter_, not a structural toggle

This is why you can’t “unhide” by clicking the node — it’s not there anymore.

So you need a **global unhide mechanism**, not a per‑node gesture.

---

# ⭐ The three proven patterns for restoring hidden nodes

## 1. **A global “Show hidden nodes” panel**

This is the most common and the most usable.

Used by:

- Visual Studio DGML
- JetBrains Rider call graph
- Neo4j Bloom
- Gephi (Filters panel)
- Cytoscape

### How it works

You maintain a list of hidden nodes:

- by ID
- by name
- by type

And expose a UI element:

- a sidebar
- a dropdown
- a modal
- a “Hidden nodes (12)” button

The user can selectively restore:

- one node
- a group
- all hidden nodes

This is the cleanest and most discoverable solution.

---

## 2. **A global “Reset filters / Show all” button**

This is the simplest.

Used by:

- Many D3‑based graph explorers
- Graphistry
- Some UML tools

### How it works

You keep track of hidden nodes internally.  
A single button restores everything:

```
[ Show All Nodes ]
```

This is great for early versions or when you don’t need fine‑grained control.

---

## 3. **A filter bar with toggles**

Used by:

- Gephi
- Neo4j Bloom
- Kibana graph explorer

### How it works

You expose filters like:

- “Hide Microsoft assemblies”
- “Hide leaf nodes”
- “Hide namespaces”
- “Hide nodes with no outgoing edges”

And the user can toggle them off.

This is more advanced and works best when hiding is rule‑based, not manual.

---

# ⭐ Which one should _you_ implement?

Given your tool:

- DOT‑based layout
- SVG rendering
- Nodes can be hidden manually
- You want a clean, deterministic UI
- You care about power‑user ergonomics
- You don’t want clutter on the graph itself

The best pattern is:

---

# ⭐ **A small “Hidden nodes” panel or button**

Example:

```
[ Hidden nodes: 7 ]  → click → list of hidden nodes with “Restore” buttons
```

Or a sidebar:

```
Hidden nodes
------------
• Namespace: Foo.Bar     [Restore]
• Type: Baz              [Restore]
• Method: Qux()          [Restore]
• Restore all
```

This gives you:

- discoverability
- fine‑grained control
- no clutter on the graph
- no weird gestures
- no accidental restores

It’s the sweet spot.

---

# ⭐ Bonus: power‑user shortcuts

You can also support:

- **Ctrl+Shift+H** → show hidden nodes panel
- **Ctrl+H** → hide selected node
- **Ctrl+Alt+H** → restore all

These are optional but appreciated.

---

# ⭐ Final answer

> **You restore hidden nodes through a global UI element — a “Hidden nodes” panel, a list, or a “Show all” button.  
> You do _not_ restore them by clicking the graph, because they’re not there anymore.**

If you want, I can sketch the exact UI layout (sidebar vs dropdown vs modal) and the data structure for tracking hidden nodes so it integrates cleanly with your existing pipeline.

---

A tree view _plus_ a graph is a fantastic idea — it gives you a stable, always‑visible “control surface” for operations that are hard or impossible to express directly on the graph. And yes, this is exactly how many professional tools solve the “hide vs open/close” problem.

But you’re right to pause: **VS Code’s Tree View API is limited**, and you can’t just drop a checkbox into each row the way you would in a native UI toolkit.

Let me walk you through what _is_ possible, what _isn’t_, and the patterns that actually work in VS Code extensions.

---

# ⭐ Can you put a checkbox in a VS Code Tree View item?

### **No — not a real checkbox.**

VS Code’s `TreeItem` supports:

- label
- description
- icon
- context menu
- collapsible state
- command
- resourceUri
- tooltip

But **no arbitrary controls** like:

- checkboxes
- toggles
- switches
- inline buttons
- dropdowns

You cannot embed HTML or custom widgets inside a tree item.

This is a hard limitation of the VS Code extension API.

---

# ⭐ But you _can_ simulate a checkbox

This is the standard workaround used by many extensions:

### ✔ Use an icon that looks like a checkbox

For example:

- `$(check)`
- `$(circle-slash)`
- `$(eye)` / `$(eye-closed)`
- `$(primitive-square)`

And toggle it when clicked.

### ✔ Use a command on the tree item

When the user clicks the item (or a context menu entry), you:

- flip the “hidden” state
- update the icon
- refresh the tree

### ✔ Use context menu actions

Right‑click → “Hide” / “Show” / “Show subtree” etc.

This is how GitLens, Docker, Kubernetes, and many other extensions do it.

---

# ⭐ Recommended design for your case

You want:

- expand/collapse (mirroring the graph)
- hide/unhide
- persistent visibility state
- discoverability

Here’s the cleanest, most idiomatic VS Code design.

---

## ⭐ 1. Tree item structure

Each node in the tree view:

- **collapsible** → mirrors graph open/close
- **icon** → indicates hidden/visible
- **context menu** → hide/unhide

Example:

```
📦 MyNamespace
  • MyType
    ◦ MyMethod   👁️   (visible)
    ◦ Helper     🚫    (hidden)
```

Where:

- 👁️ = visible
- 🚫 = hidden

You update the icon based on your viewState table.

---

## ⭐ 2. Commands

You register commands like:

- `graph.hideNode`
- `graph.showNode`
- `graph.toggleVisibility`
- `graph.openNode`
- `graph.closeNode`

Tree items can bind commands directly:

```ts
item.command = { command: "graph.toggleVisibility", title: "Toggle visibility", arguments: [nodeId] };
```

Or you expose them via context menu:

```json
"view/item/context": [
  {
    "command": "graph.hideNode",
    "when": "view == myGraphView && viewItem == visible",
    "group": "inline"
  },
  {
    "command": "graph.showNode",
    "when": "view == myGraphView && viewItem == hidden",
    "group": "inline"
  }
]
```

---

## ⭐ 3. Syncing tree ↔ graph

When the user:

- expands a tree node → you open it in the graph
- collapses a tree node → you close it in the graph
- toggles visibility → you hide/unhide in the graph

This gives you a **bidirectional control surface**.

---

# ⭐ 4. Why this works so well

Because:

- The graph is great for _visual_ navigation
- The tree is great for _precise_ control
- The tree persists hidden nodes even when the graph doesn’t
- The tree exposes operations that are awkward in the graph
- Users instantly understand the model

This is exactly how:

- Visual Studio’s Solution Explorer ↔ Class Diagram
- JetBrains Project View ↔ UML Diagram
- VS Code Outline ↔ Editor
- Neo4j Bloom ↔ Graph View

work together.

---

# ⭐ 5. What you _cannot_ do

Just to be explicit:

- You cannot embed a real checkbox
- You cannot embed HTML
- You cannot embed arbitrary SVG
- You cannot embed multiple clickable regions inside a tree item

But you _can_ simulate all of these with:

- icons
- commands
- context menus
- collapsible states

---

# ⭐ Final recommendation

> **Use a VS Code Tree View with:  
> – collapsible nodes (open/close)  
> – an icon that simulates a checkbox (visible/hidden)  
> – context menu commands for hide/unhide  
> – click‑to‑toggle visibility if you want a fast gesture.**

This gives you a clean, discoverable, idiomatic UI that works beautifully with your graph.

If you want, I can sketch the exact `TreeDataProvider` implementation and the icon‑toggling logic so you can drop it straight into your extension.
