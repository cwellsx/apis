Goal is as described in the [README](./README.md).

- Now -- Refactor
- Next -- Begin to use an agent
- Next -- Integrate in VS Code Extension
- Next -- Use experimentally and improve UI
- Later -- Replace GraphViz
- Later -- More languages, documentation, AI, ...

## Now -- Refactor

Before continuing do a ground-up rewrite:

- [x] Reimplement the .NET application
- [x] Reimplement the SQL model
- [-] Reimplement the backend
- [ ] Reimplement the front end

For current details and status see [`backend/src/TODO.md`](./packages/backend/src/TODO.md).

## Next -- Begin to use an agent

- Don't try an agent for the previous refactoring
- Before continuing, install a local agent
- Also revise the README

## Next -- Integrate for VS Code Extension

Port the existing Electron app to run alternatively as a VS Code extension,
before further iterating on the UI.

### Why -- Goals

<details><summary>Better packaging</summary>

Compared with an Electron app, a VS Code extension:

- UX is more familiar
- Installation (via Visual Studio Marketplace)
- Integration with user's IDE for source code
</details>

<details><summary>Cleaner architecture</summary>

Supporting both is a constraint
which requires a cleaner architecture,
beyond the separation required by Electron:

- Generic/reusable "Node" code in the backend ("model" and "presentation" layers)
- Abstraction of the UI, with two implementations of that abstraction
</details>

<details><summary>UI design</summary>

VS Code constrains the UI, whereas an Electron app's UI could be anything.

- That constraint is "UI architecture" or "framework"
- Maybe better UI if designed within a framework
</details>

<details><summary>Window management</summary>

VS Code has built-in support for multiple windows -- docking, splitting, etc.

</details>

### Expected -- deliverable

- New code in the `vscode-ext` package
- Able to show the same data as the Electron application can
- Backend code included in the builds of both applications

### Out of scope

<details><summary>Documentation (all <code>*.md</code>)</summary>

I said "minimize technical debt" except documentation is out of scope

- All `*.md` files are early prototypes -- unmaintained and unreliable
- The only "supported" files are this ROADMAP and the [README](./README.md)
</details>

### How

Use `vscode` extension APIs to display the data from the backend presentation layer.

- Implement the `DisplayApi` including the `RendererApi` in the extension
- Pass that API as a parameter to the backend's openDataSource function

Comparatively:

- In the Electron app everything is rendered in one window using React.
- VS Code exposes several UI element API for an extension to use.

<details><summary>Settings</summary>

VS Code has a UI for extensions' settings, and storage for these settings.

- The extension should use this storage
- That may need refactoring the backend API, which expect to contain the settings

I don't find VS Code settings especially easy to use

- Use them for infrequently-modified configuration, e.g. `AppConfig` and `AppOptions`
- The view state which is modified frequently by the UI will remain in the backend

</details>

<details><summary>TreeView (for the filter)</summary>

The visible nodes are displayed in a tree view as well as on the graph.

- In the Electron app these are displayed in a 3rd-party React component.
- In the VS Code extension it would be better to use the `vscode.TreeView`

</details>

<details><summary>WebView (for the graph)</summary>

I hope to avoid React in the `Webview`, and instead inject only enough TypeScript to:

- Load an SVG into the DOM
- Install event handlers on for on-hover and on-click

In future there'll be more UI elements -- context menus and/or a toolbar on hover -- these too are presumably implementable without React.

</details>
<details><summary>TBD for text-like details</summary>

I need to render text-like details:

- The contents of a group -- e.g. types and method
- The contents of a method -- i.e. lines of code
- Various diagnostics

The token tree within a group is presumably displayed in a TreeView.

Displaying lines of code is TBD.

</details>

## Next -- Use experimentally and improve UI

When it runs "as designed" then experiment to make it more usable.

- The problem is that real-world code is large and difficult to navigate.
- Graphical views are easily overwhelmed when showing more than a "toy" quantity of data

So try it on real-world software and ask,

> How would I like to manipulate this view -- to summarize, drill down into, and/or extract from this data?

I expect this experiment will rapidly develop a list of new UI features to be implemented.

<details><summary>Endpoints</summary>

A feature I already foresee is highlighted in the README, i.e. endpoints and event handlers.

- Need to find these in the software and present them
- They may already be findable in the model, or might be found earlier and inserted into the model

Endpoints include e.g. gRPC client and server endpoints initially.

</details>

<details><summary>Subclasses</summary>

Using dependency injection software often calls abstract interfaces instead of calling implementations.

- It may be know what implementation is called at run-time but you can often guess
- There may be only one implementation of interface, with a virtual interface to enable mocking in the unit-tests

When chasing a call chain, the API Viewer should substitute the implementation of the method in the subclass, instead of the abstract method in the interface.

A similar use case for this is in network endpoints, e.g. the server endpoint of an API is abstract base class with abstract methods to be implemented by the server.

</details>

<details><summary>Synthetic namespaces</summary>

The graph isn't useful for displaying 100 nodes.

- For example there are 100 types in the Core.exe of the backend-dotnet package
- These are viewable because, in the source code, they are subdivided/clustered into namespaces
- Some other worse codebases might not use namespaces internally

The solution might be to synthesize namespaces or clusters of types.

<details><summary>Graph clustering algorithms</summary>
Use algorithms to find communities -- groups of types that are strongly connected internally but weakly connected externally

- Louvain modularity
- Leiden
- Girvan–Newman
- Infomap
- Spectral clustering

This is used by NDepend’s Dependency Matrix and Dependency Graph auto‑grouping.

</details>

<details><summary>Name‑pattern clustering</summary>
Types often follow naming conventions:

- `FooService`, `BarService`, `BazService` → “Services”
- `FooController`, `BarController` → “Controllers”
- `FooRepository`, `BarRepository` → “Repositories”
- `FooManager`, `BarManager` → “Managers”
- `FooHelper`, `BarHelper` → “Helpers”

You can infer clusters based on suffixes or prefixes.

This is used by VS Architecture Explorer.

</details>

<details><summary>User-defined groups</summary>
Instead of trying to infer groups automatically:

- User creates their own synthetic groups
- Maybe drag and drop to assign nodes to groups

Or use chat with an agent to edit a mapping file -- lets the user describe what and how they want to group.

</details>

</details>

<details><summary>Progressive reveal</summary>

Different types of progressive reveal:

- Outside in -- edges between clusters while hiding their internal detail
- Internal -- edges within a cluster while hiding its external edges
- Focused -- all edges, near and far, of a single component

</details>

## Later -- Replace GraphViz

GraphViz cannot generate some kind of diagram, e.g.

- Top-level clusters on the graph
- Details of each cluster within each cluster
- Zoom into the cluster to view its details
- i.e. cluster as nested canvasses

Also:

- Reflow layout interactively

Some alternatives are as follows:

- Cytoscape.js -- easiest interactive solution
- ELK.js -- best layout quality + nested nodes
- Dagre + D3 -- most customizable

<details><summary>Cytoscape.js</summary>

- Many features -- zooming, panning, collapse/expand, incremental reveal, dynamic layout, custom styling
- JSON input -- easy conversion from DOT
- Layout not as pretty as GraphViz but can use Dagre (Graphviz‑like) inside Cytoscape

</details>

<details><summary>ELK.js (Eclipse Layout Kernel)</summary>

- Modern successor to Graphviz for hierarchical layouts
- Has a WASM version (ELK.js)
- Supports nested nodes, pan, zoom, better at large graphs than GraphViz, used in VS Code extensions
- No built‑in viewer -- embed ELK in your own canvas/SVG UI

</details>

<details><summary>Dagre + D3.js</summary>

- JavaScript port of Graphviz’s DOT layout algorithm
- Works with D3.js for zoom/pan
- No built‑in nested cluster navigation => more engineering effort
- This is a “Graphviz‑but-interactive” toolkit

</details>

## Later -- More languages, documentation, AI, ...

With the previous stage finished, the tool is now useful for me and perhaps my colleagues.

Additional changes might make it more broadly useful to the public.

<details><summary>Further languages</summary>

Beyond .NET:

- It might be easy and useful to support TypeScript
- There are large C++ codebases too for which some additional tooling could be helpful

Any of these might only require a different parser, to create a token tree for the model with method calls as token pairs.

It's TBD what helper to use for parsing, for example:

- A C++ parser might use CLang.
- I could investigate how other tools are implemented, e.g. lint
- Especially investigate the VS Code "C/C++" and "C/C++ Extension Pack" plugins

</details>
<details><summary>User documentation</summary>

With the UI implemented, write user documentation:

- Describe features
- Include screenshots

Also write the many other documents in a repo:

- INSTALLATION
- CONTRIBUTING
- etc.

The design should be self-documenting -- as an example it should show the design of its own source code.

But it should also show examples taken from much larger open-source solutions.

</details>
<details><summary>Electron application</summary>

I don't know whether it's worth maintaining the Electron application.

Time will tell whether there's a limitation in the VS Code extension architecture that would allow a standalone application to be more powerful.

- If so -- port UI features from the VS Code extension back into the Electron application
- If not -- leave the Electron application as a down-version legacy packaging PoC

</details>
<details><summary>AI integration</summary>

Perhaps the tokenized model could be useful to an AI agent.
The parser probably makes the model more compact than an agent's scanning source code.
But I don't know how to make the model -- the token tree, token pairs, call stacks, end-points -- available to an agent, so this is TBD.
I imagine it might be:

- Export selected tables or views from the SQLite database to a format like JSONL which an agent can consume
- Pass these JSONL files as "context" to an agent
- Ask the agent to answer questions about the code, using this context/model

</details>
<details><summary>Round trip</summary>

I see the API Viewer as read-only -- it's for browsing not for editing software.

When it's run as a VS Code extension there is opportunity to integrate it with the source code.

How to use that possible integration is TBD -- at a minimum perhaps open the right source file when the user wants to see details of an element.

Another type of round-tripping might be incremental rebuilding of the model.
Parsing the assembled software takes significant time -- many seconds and longer, more than it takes to compile it.

</details>
