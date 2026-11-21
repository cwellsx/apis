# Data flow

Where the data comes from, where it goes, and how it is used. The two flows are the whole of it; everything
else in this documentation describes one stage of one of them. What the data *is* is `DATA-MODEL.md`.

## Where the data comes from

```
assemblies folder
  -> backend-dotnet (Core.exe): System.Reflection + ICSharpCode.Decompiler
  -> JSON (Reflected / All)
  -> dotnetFetch (TypeScript <-> .NET bridge)
  -> sqlDotnet (createTables, insertAll) -> SQLite
```

`Core.exe` reflects over a build or installation folder and decompiles what it finds, emitting JSON. How it
does that is its own business, described in `PACKAGES.md`; what matters here is the shape of what it emits and
what the backend does with it.

[`dotnetFetch`](../../packages/backend/src/dotnetFetch/) is the boundary: it encapsulates
`electron-cgi`, exposing `getWhen` for caching and `getJson` to invoke the decompiler and fetch its results.

## Where it's stored

Into **SQLite**, through [`sqlio`](../../packages/sqlio/src/): the model in
[`sqlDotnet`](../../packages/backend/src/sqlDotnet/), the schema the databases share in
[`sqlCommon`](../../packages/backend/src/sqlCommon/), a custom data source in
[`sqlCustom`](../../packages/backend/src/sqlCustom/), and the settings in
[`sqlAppConfig`](../../packages/backend/src/sqlAppConfig/). One file per data source, named after a hash of
what was loaded -- so a second run over the same assemblies reuses the tables instead of rebuilding them.

**The model is written once**, and only read afterwards. The exception is the view state: which nodes are
hidden or expanded, and the options of the selected view, are written to their tables as you work -- in the
same database, which is why both survive a restart.

## Preprocessing on storage

Two aggregations happen as the model is inserted, and they are why the backend reads relationships rather than
deriving them: each token is stored with the tree above it, and each call is rolled up through type, namespace
and assembly so that a row exists for any pair of ids at the same granularity.

`DATA-MODEL.md` describes what that makes the data.

## How it's used

```
selected view (dotnet / custom)
  -> viewState (forest of nodes + node state)
  -> presenter (createPresenter -> imageData)
  -> image (toDotFormat -> GraphViz via @viz-js/viz)
  -> SVG (with hit areas merged from the cmapx image map)
  -> IPC -> RendererApi.show -> Electron window or VS Code webview
```

UI events -- expand, collapse, filter, menu, options -- flow back through `PresenterApi`. Each is applied where
it belongs, to node state or to the view's options, both of which are stored in SQLite; the views are then
re-rendered and sent again. A batch of events may also ask for the menu items or the options as extra views,
which is how the options panel learns what was stored.
