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

- input data is created by src.dotnet using System.Reflection and ICSharpCode.Decompiler
- createDotNetApi is the interface between typescript and src.dotnet
- intput data format returned by dotNetApi.getJson is defined by
  - type Reflected in typescript
  - record All in the .NET Core.Output.Public namespace
- Reflected input data is passed to the save method of the SqlLoaded class
