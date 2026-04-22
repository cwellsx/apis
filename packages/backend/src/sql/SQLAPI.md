# SQL API

## contracts\dotnet

Rework this folder:

- Rename `Reflected` to `All`
- Rename all type to match .NET

Import using

```ts
import type * as DotNet from "@contracts-dotnet";
```

All `*Id` types should be branded objects

```ts
type MethodId = object & { __brand: "MethodId" };
```

## TypeScript path alias

Currently these depending on which level of subdirectory

```ts
import type { AssemblyReferences } from "../contracts-dotnet";
import type { AssemblyReferences } from "../../contracts-dotnet";
```

Instead in `tsconfig.json`

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@contracts-dotnet/*": ["packages/contracts-dotnet/*"],
      "@contracts-dotnet": ["packages/contracts-dotnet/index.ts"]
    }
  }
}
```

```ts
import type { AssemblyReferences } from "@contracts-dotnet";
```

Delete `contracts-*.ts` from `src` folder.

## Keys

### JSON

C# serializes IDs into JSON -- may be string, number, or array.

TypeScript:

- Parses the JSON
- Implements the same Factory methods as C# to transform objects into [AssemblyName, MetadataToken] pairs

### SQLite

Tables use 64-bit rowid as the key.

This is bigint in the TypeScript code.

These are the 32-bit MetaDataToken plus the rowid of the AssemblyName.

There are AssemblyName and Namespace tables which map these names to rowids.

- 32-bit MetadataToken is unique within each assembly
- Add AssemblyToken << 32 to make the MetadataToken globally unique

There's also a NamespaceToken.

AssemblyToken and NamespaceToken

- Could be bigint like other tokens
- Instead could be number because 16-bit (64 K) is enough
- Distinguished from .NET tokens by having zero in the high 32-bit
- Distinguished from each other by the 16th bit

### Backend

Reuse the rowid as a bigint in the backend code.

A bigint is supported in Node.js and bettersqlite3 -- except that it can't be serialized to JSON nor sent via Electron IPC.

There'll be branding to distinguish IDs.

```ts
type TypeId = bigint & { __brand: "TypeId" };
```

For debugging there can be a computed property

```ts
type TypeInfo = { id: TypeId; name: string; get fullName() };
```

The FullName instance can be registered as a global static object:

```ts
globalThis.FullNames = {
    getTypeFullName(id: TypeId) {
        ...
    }
}
```

### Debugging

There can be a BigIntId.decode method to return a friendly name.

## Tables

The data in the All object deserialized from JSON is loaded once into various tables as follows.

### Assemblies

- id: rowid
- name: string
- isMicrosoft: boolean

### Namespaces

- id: rowid
- name: string

### TypeInfos

- id: rowid // imcludes assemblyId in upper bits
- namespace?: id
- name: string
- declaringType?: id

### Members

- id: rowid
- typeId: id
- json: string

### FullNames

- id: rowid
- fullName: string

### Views

- id: number
- name: string

### ViewStates

- id: number
- token: bigint
- hidden: boolean
- expanded: boolean

### Parents

- assembly: number
- namespace: number
- typeId: bigint
- methodId: bigint

### Calls

- fromAssemblyId: number
- fromTypeId: bigint
- from methodId: bigint
- toAssemblyId: number
- toTypeId: bigint
- toMethodId: bigint

### Edges

- fromId: bigint
- toId: bigInt

## View state

Works with assemblies or namespaces -- either, not both.

Namespaces are nested, but no synthetic parents.

Every node is visible but closed by default
so empty view state implies all assemblies or namespaces shown
but not expanded to show their children.

## Edges

A method is visible if:

- Its assembly is not explicitly invisible
- Its type is not explicitly invisible

Therefore all methods are initially visible (but aggregated).

This would be expensive to compute => precompute aggregated edges using GROUP BY.

The (expanded) contents of edges are not determined for all edges nor displayed on the graph.

Instead they are "by request" -- user clicks on an edge => its contents are displayed in a side panel.
