This includes these layers

## sql

This is the bottom level, its exported modules include:

```ts
export * as Id from "./idTypes";
export type { SqlApi } from "./sqlApi";
export type * as Sql from "./sqlApiTypes";
```

## query

This is the "Query Layer" aka "Data Access Facade".

### queryLayer

- read-only
- encapsulate/extends SqlApi
- extracts/returns the data types required by the UI

### nodes

### tree

- read-write
  is read-only wrapper

##

SQLite (normalized schema)
↓
SQL Core (thin domain-level API)
↓
GraphQuery (UI-oriented read model)
↓
View State (UI-specific persisted state)
↓
Graph View Model (event handlers)
↓
Graph Renderer + Tree View
