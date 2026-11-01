# Overview

## Creation

- openDataSource is the factory method -- it returns a PresenterApi instance
- PresenterApi is implemented by createPresenter
- application must handle AppView data which the PresenterApi returns to the frontend

### Electron

- openDataSource result is added to the appWindows collection
- frontend invokes onEvent methods via IpcMain which created by preload

### Extension

tbd

## Data flow

### Input

- input data is created by packages/backend-dotnet using Mono.Cecil and ICSharpCode.Decompiler
