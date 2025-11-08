# Overview

## Creation

- openDataSource is the factory method -- it returns a MainApiAsync instance
- MainApiAsync is implemented by createAppWindow and createCustomWindow
- application must implement DisplayApi through which data is output to frontend

### Electron

- openDataSource result is added to the appWindows collection
- frontend invokes MainApi methods which created by preload
- IpcMain events call MainApiAsync methods via invoke method

### Extension

tbd

## Data flow

### Input

- input data is created by src.dotnet using System.Reflection and ICSharpCode.Decompiler
- createDotNetApi is the interface between typescript and src.dotnet
- intput data format returned by dotNetApi.getJson is defined by
  - type Reflected in typescript
  - record All in the .NET Core.Output.Public namespace
- Reflected input data is passed to the save method of the SqlLoaded class

### Output

- output data is created by subroutines of showViewType
- they require only sqlLoaded so they could be a separate object
- createViewGraph is called before display.showView for these view types
  - references
    - sqlLoaded
      - readAssemblyReferences
      - readGraphFilter
    - convertLoadedToReferences
  - apis
    - sqlLoaded
      - readCalls
      - readGraphFilter
    - convertLoadedToCalls
    - convertCallstackToImage
  - methods
    - sqlLoaded
      - readCallstack
      - readGraphFilter
    - convertLoadedToCallstack
    - convertCallstackToImage
  - custom

## Input from sqlLoaded

### readAssemblyReferences

- returns the references of each assembly
- returns type AssemblyReferences

```
export type AssemblyReferences = {
  [key: string]: string[]; // dependencies/references of each assembly
};
```

### readGraphFilter

- returns type GraphFilter

```
export type GraphFilter = {
  leafVisible: NodeId[];
  groupExpanded: NodeId[];
  isCheckModelAll: boolean;
};
```

The GraphFilter comes directly from CheckboxTree in Tree.tsx

This calculation must be changed, implemented in backend code instead.

The onCheck and onExpand events return an array and the specific
so change setLeafVisible and setGroupExpanded to expect a single node.
