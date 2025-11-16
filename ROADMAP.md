Goal is as described in the [README](./README.md).

- Now -- Refactor for VS Code Extension
- Next -- Integrate in VS Code Extension
- Next -- Use it experimentally and improve the UI
- Later -- Further languages, documentation, maybe AI

Project was paused October 2024, restarted August 2025.

## Now -- Refactor for VS Code Extension

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

### Caution -- cleanup required

The next phases will be developing UI:

- Implementing a VS Code version of the abstract UI
- Iterating to add new features to the presentation layer

Before then, i.e. now:

- Fix every known issue in the current presentation layer
- Use the current UI i.e. the Electron app to verify fixes

### Expected -- deliverable

- Backend code included in the builds of both applications
- API receives data from the presentation layer to render in the UI
- API sends events from the UI to update view state in the presentation layer
- Backend code is bug-free and easy to maintain -- minimize technical debt

### Out of scope

<details><summary>Documentation (all <code>*.md</code>)</summary>

I said "minimize technical debt" except documentation is out of scope

- All `*.md` files are early prototypes -- unmaintained and unreliable
- The only "supported" files are this ROADMAP and the [README](./README.md)
</details>

<details><summary>Unit tests</summary>

The project currently has no automated unit tests.

Being a solo developer, instead I system-test (i.e. run the application and review the UI) after any change:

- See also my topic, [Should one test internal implementation, or only test public behaviour?](https://stackoverflow.com/q/856115/49942)

I accept I will want these tests eventually.
IMO that's premature while I am still refactoring the APIs.

I intend to do it later:

- When I write the user document
- Then I will take screenshots of the UI
- And write automated regression tests to verify that the app continues to produce the data shown in the screenshots

If necessary i.e. if my priorities changed I could do it now.

</details>

### How

These are issues to be fixed before this phase is "done".

<details><summary>Refactoring -- completed</summary>

This refactoring is more-or-less complete now:

- Create a monorepo for several packages
- Same versions of dependencies for both applications
- ESLint and TypeScript debugging of all packages including the backend
- Remove Electron dependencies from the backend and define two abstract APIs
- Refactor backend modules for cleaner public contracts and internal folder-level APIs
- Test the result by regression-testing the Electron app

Proof-of-concept for the VS Code extension to de-risk it:

- Build and use the SQLite dependency
- Implement a WebView to display an SVG
- TypeScript in the WebView to make it interactive
- Two-ways APIs between the WebView and the extension
</details>

<details><summary>Refactoring -- still TODO</summary>

The public `backend/contracts` are in place.
The internal `backend/src` APIs need further improvement.
These are related to several of the other issues below.

When this refactoring is finished:

- This should be deleted -- [TODO](./packages/backend/src/TODO.md)
- This should be merged into to the README in the folder above it -- [OVERVIEW](./packages/backend/src/OVERVIEW.md)

</details>

<details><summary>leafHidden instead of leafVisible</summary>

This is currently used as view state:

```ts
export type GraphFilter = { leafVisible: NodeId[]; groupExpanded: NodeId[] };
```

This requires that visible nodes be listed explicitly, which is a problem:

- An invisible top-level node can't be toggled
- We need to synthesize this list when new model data is inserted

Instead reverse the logic to use `leafHidden` instead.

So, by default, all top-level nodes in a view will be neither hidden nor expanded.

</details>

<details><summary>Maintain GraphFilter in the backend</summary>

Currently in the Electron app the GraphFilter data is:

- Displayed in a 3rd-party React component named `CheckboxTree`
- Mutated by the CheckboxTree when the user interacts with the UI
- Returned to the backend as a filter for the presentation layer

This must be changed:

- A VS Code extension will use `vscode.TreeView` instead of `CheckboxTree`
- Logic to mutate the view state belongs in the backend

</details>

<details><summary>Refactor SQL module</summary>

I haven't yet reviewed the `sql` module since last year:

- Check that it still makes sense
- Create abstract contract types to export instead of implementation
- Identify modules which create the model from the JSON which the parser generates

</details>

<details><summary>Tighten coupling between model and presentation</summary>

Currently the presentation layer:

- Selects data from the model
- Filters or post-processes the data
- Sends the result to the UI

This won't scale when the model is huge.

- Both CPU and memory limit how much data the presentation layer should process
- The SQLite layer is better able to handle this:
  - Data is stored on disk, not in process memory, with its I/O cached by the O/S
  - It should be quick enough to select however many elements can reasonably be shown on one view

So use the model API to select only whatever data will be displayed.

Goal is that the delay should always be negligible compared to the time it takes for GraphViz to render the SVG.

</details>

<details><summary>Multiple view instance</summary>

Currently view state is stored in the same database as the model
so there is only one view per model.

To support multiple views (multiple windows or display panels) per model
the view state tables must be duplicated or have some a "view ID" column added.

</details>

<details><summary>Grouping names</summary>

It's common for namespaces and assemblies to have long, compound names, e.g.:

- `System.Reflection.MetadataLoadContext`

A feature to make the overview useful is to split these names to group them, e.g. to create these parent nodes:

- `System`
- `System.Reflection`

This is currently implemented in the presentation layer:

- This implementation is difficult
- Instead it might be better to do it by injecting synthetic tokens into the model

If not then at least it needs to be tidied in the presentation layer, where there's currently different implementations for different view types.

</details>

<details><summary>Unit tests</summary>

I hoped to delay writing unit tests
until I began to take screenshots for documentation --
those screenshots would be "contracts" and unit-tests could regression-test selecting the data which they present.

Instead perhaps I should begin to write at least unit-tests now --
when, what, and why are still TBD.

</details>

<details><summary>Compiler-emitted types</summary>

Newer version the C# language -- e.g. the `aync` keyword --
are implemented by emitting compiler-generated types.

- These aren't seen by the source code author
- They shouldn't be displayed by the API viewer
- Instead their code belongs with a user method

There's already code to implement this:

- See `compilerMethods.ts` and `compilerTransform.ts`
- This used to work completely
- It's incomplete now i.e. I see unhandled compiler-generated types in the UI's output
- Perhaps this was caused by using a newer version of the compiler/language in the .NET software

</details>

<details><summary>Investigate Roslyn</summary>

A different and more normal way to parse .NET is with the Roslyn APIs to parse source code.

Investigate this to see whether it might be significantly better than -- or an alternative to -- the current solution which parses compiled assemblies.

- This is e.g. `Microsoft.CodeAnalysis.CSharp` reference
- It produces a `CSharpSyntaxTree` which might be what I need
- Create a `CSharpCompilation` and call `GetSemanticModel` to get type information

If this is desirable but not necessary then consider moving it to do "Later".

</details>

<details><summary>Tighter ILSpy integration</summary>

The `src.dotnet/Core` project currently use two dependencies in their implementation:

- `System.Reflection.MetadataLoadContext`
- `ICSharpCode.Decompiler`

Perhaps this should be changed:

- Why use both?
  - I must use ICSharpCode for the method calls
  - Should I use it entirely instead of also using System.Reflection?

- Can it solve the problem of Compiler-emitted types
  - It's able to disassemble code without displaying compiler-emitted types
  - If so I could remove my code from the backend, which is complicated and fragile

  I don't know yet -- the ICSharpCode implementation is large and not necessarily public.

</details>

<details><summary>More TODO</summary>

There's an older TODO file here:

- [TODO](./docs//unknown.old/TODO.md)

Careful -- there are many items in this list

- Some may be obsolete
- Many are details of the Electron app UI, which is deprecated for now with focus on the VS Code Extension instead
- Some are already mentioned in this roadmap
- Some of these items may still be valid

This TODO should be reviewed and integrated into this ROADMAP.

</details>

## Next -- Integrate in VS Code Extension

Integrate the shared backend into the VS Code Extension,

### Why -- Goals

So that data from the backend renders in VS Code as well as it does in the Electron application.

### Expected -- deliverable

- New code in the `vscode-ext` package
- Able to show the same data as the Electron application can

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

There are differences between these components e.g. the VS Code TreeView cannot display a checkbox with each item.

How to render this using VS Code is still TBD.

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

## Next -- Use it experimentally and improve the UI

When application's UI runs "as designed", it's time to experiment to make it more usable.

### Why -- Goals

Making it useful will be challenging and rewarding.

- The problem is that real-world code is large and difficult to navigate.
- Graphical views are easily overwhelmed when showing more than a "toy" quantity of data

### Expected -- deliverable

- Genuinely useful tool for me to use, to explore a real codebase, and to share with colleagues

### How

To resolve this I expect to try it on real-world software and ask

> How would I like to manipulate this view, to summarize, drill down into, and/or extract from this data?

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

## Later -- Further languages, documentation, maybe AI

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
