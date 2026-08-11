# To Do

## Long term -- replace modules

| New       | Obsolete |
| --------- | -------- |
| sql2, id2 | sql      |
| output2   | output   |
| dotnet2   | dotnet   |
|           | input    |
|           | nodeIds  |

Change modules which depend on the above.

| New       | Component                                 |
| --------- | ----------------------------------------- |
| sql2, id2 | Repository or Persistence Adapter         |
| viewState | Domain Model or ViewModel plus View State |
| output2   | Presenter                                 |
| contracts | Output Port                               |
| input(2)  | Controller or Interactor                  |

## Maintain `openDataSource` method

Maintain support for the `openDataSource` method which returns `MainApiAsync` interface.

This includes these imports to be reimplemented

```ts
import { createAppWindow, createCustomWindow, ShowReflectedEx } from "./input";
import { MenuViewTypes, ShowBase, showCustom, showMethods, ShowReflected, showReflected } from "./output";
import {
  createSqlCustomFromJson,
  createSqlLoadedFromCoreJson,
  createSqlLoadedFromDotNet,
  SqlCustom,
  SqlLoaded,
} from "./sql";
```

This is mostly a wrapper around

- `createSqlLoadedFromDotNet` which return `SqlLoaded`

  ```ts
  switch (dataSource.type) {
    case "loadedAssemblies":
      tuple = openAppWindow(await createSqlLoadedFromDotNet(dataSource));
      break;

    case "coreJson":
      tuple = openAppWindow(await createSqlLoadedFromCoreJson(dataSource));
      break;

    case "customJson":
      tuple = openCustomWindow(await createSqlCustomFromJson(dataSource));
      break;
  }
  ```

- `openAppWindow` which returns `mainApi`:

  ```ts
  const openAppWindow = (sqlLoaded: SqlLoaded): Tuple => {
    const { show, menu } = showReflected(display, sqlLoaded, appConfig, dataSource.path);
    const showEx = getShowReflectedEx(sqlLoaded, appConfig, show, display);
    const mainApi = createAppWindow(sqlLoaded, appConfig, showEx);
    return [mainApi, menu, show];
  };
  ```

## `createSqlLoadedFromDotNet`

The `SqlLoaded` class contains these methods:

```ts
export class SqlLoaded {
  save: (reflected: Reflected, when: string) => void;
  shouldReload: (when: string) => boolean;
  viewState: ViewState;
  readAssemblyReferences: () => AssemblyReferences;
  readTypeInfos: (assemblyName: string) => TypeInfo[];
  readCalls: (clusterBy: ClusterBy, expandedClusterNames: string[]) => Call[];

  readCallstack: (nodeId: MethodNodeId) => CallstackIterator;

  // reads data for DetailedMethod
  readMethodDetails: (nodeId: MethodNodeId) => { title: MethodName; asText: string };
  // reads data for ViewCompiler
  readCompiler: () => { compilerMethods: CompilerMethod[]; localsTypes: LocalsType[] };

  // utility method
  readNames: () => GetTypeOrMethodName;
  readGraphFilter: (viewType: CommonGraphType, clusterBy: ClusterBy) => GraphFilter;
  writeGraphFilter: (viewType: CommonGraphType, clusterBy: ClusterBy, graphFilter: GraphFilter) => void;

  close: () => void;
```

This is replaced by two methods:

- `createSqlCore` creates and initializes `Tables` which are all the `SqlTable` elements

  ```ts
  export const createSqlCore = async (dataSource: DataSource): Promise<{ all: All; tables: Tables }> => {
    const { when, getAll } = await onType(dataSource);

    const filename = getAppFilename(`${dataSource.type}-${hash(dataSource.path)}.db`);
    log(`db filename: ${filename}`);

    const all = await getAll(dataSource);
    assert(Object.keys(all.assemblies).length != 0);

    const db = createSqlDatabase(filename, getSqlNodePath());
    dropTables(db);
    const tables = createTables(db);
    insertAll(all, tables);
    return { all, tables };
  };
  ```

- `createViewState` uses Tables to create `ViewState` which includes the `Forest` element which replaces the previous `Calls`

  ```ts
  export type ViewState = {
    getForest: () => Forest;
    getNewForest: () => Forest;
    getRootNode: (forest: Forest, name: string) => Node | undefined;
    setNodeState: (id: NodeId, nodeType: AnyNodeType, nodeState: NodeState) => void;
  };

  export const createViewState = (sqlTables: Sql.Tables, viewType: ViewType): ViewState => {
  ```

- Probably add new method and classes, to return
  - TypeInfo
  - MethodDetails
  - CallStack

## `createAppWindow`

This method takes `SqlLoaded` and returns (and implements) `MainApiAsync`

```ts
export type MainApi = {
  onViewOptions: OnUserEvent<ViewOptions>;
  onAppOptions: OnUserEvent<AppOptions>;
  onGraphEvent: OnUserEvent<GraphEvent>;
  onFilterEvent: OnUserEvent<FilterEvent>;
  onDetailEvent: OnUserEvent<DetailEvent>;
};

export const createAppWindow = (sqlLoaded: SqlLoaded, appConfig: AppConfig, show: ShowReflectedEx): MainApiAsync => {
```

Within its event handlers like `onGraphEvent` it switches on the current `viewType`.

## `showViewType`

`openDataSource` invokes `show.showViewType()` after `openAppWindow`.

`showViewType` is implemented in `showReflected` as either `showReferences` or `showApis`.

`showReflected` is constructed from `DisplayApi` and `SqlLoaded` instances.
It returns `ShowReflected` which is passed into `createAppWindow`.
Thus a `ShowReflected` method can be called at the end of each `MainApiAsync` event.

| `Show` method                | `AsyncApi` event |
| ---------------------------- | ---------------- |
| `showMethods(nodeId)`        | `onDetailEvent`  |
| `showViewType`               | `onFilterEvent`  |
| `showViewType`               | `onViewOptions`  |
| `showAppOptions(appOptions)` | `onAppOptions`   |
| (explained below)            | `onGraphEvent`   |

Handling of onGraphEvent depends on what element of the graph was clicked

- If `isEdgeId` then throw `Edge details not yet implemented`
- If not a leaf type then toggle expanded in view settings and then `showViewType`
- If a leaf type then, depending on the viewType
  - showMethodDetails(nodeId)
  - showAssemblyDetails(assemblyName)
  - showViewType() after changing filter

`showViewType` is one of `showReferences` or `showApis` depending on which menu item is selected.

- `showReferences`
  - sqlLoaded.readAssemblyReferences()
  - convertLoadedToReferences
  - convertToImage
  - createViewGraph and display.showView

- `showApis`
  - sqlLoaded.readCalls
  - convertLoadedToCalls
  - convertCallstackToImage
  - convertToImage
  - createViewGraph and display.showView

---

## https://github.com/caplin/FlexLayout

Use this to split the Electron window into areas.

## The following old notes are obsolete

Refactor to extract filter into a separate database.

rename customJson to isCustomJson, move it to istype/ togather with isRfeflected

Sanitize try/catch handling - search for random try and replace then, probably in wrapApi and openDataSource

Keep the factory module i.e. openDataSource in the ./

Move the remainder to ./api

Separate view state for each window

Naming:

- Prefer getX instead of createX
- A module which contains getX may be named x
- Prefer getXFromY instead of convertYToX

Reimplement windows in electron app

- instead of several BrowserWindow
- use several BrowserView or WebConectentsView in tabs
