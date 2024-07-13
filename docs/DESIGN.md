# Code design

This Electron application includes these components:

- [Source directories](#source-directories)
  - [Introduction](#introduction)
  - [`src/main`](#srcmain)
  - [`src/renderer`](#srcrenderer)
  - [`src/shared-types` and `src/preload`](#srcshared-types-and-srcpreload)
  - [`src.dotnet/`](#srcdotnet)
  - [`.vscode`](#vscode)
- [Third-party components](#third-party-components)
  - [SQLite](#sqlite)
  - [Graphviz](#graphviz)
  - [Electron](#electron)
  - [Electron CGI](#electron-cgi)
  - [Electron Forge](#electron-forge)
  - [React](#react)
  - [Npm components](#npm-components)
  - [Icons](#icons)
- [Application data](#application-data)
  - [Reading reflection data](#reading-reflection-data)
  - [Development tools](#development-tools)
  - [Metadata tokens](#metadata-tokens)
  - [Decompiling methods](#decompiling-methods)
  - [Could be simpler](#could-be-simpler)
  - [Generic methods](#generic-methods)
  - [Compiler-generated types](#compiler-generated-types)
  - [Microsoft assemblies](#microsoft-assemblies)

The build derives from the `sqlite` branch of https://github.com/cwellsx/electron_forge_template

## Source directories

### Introduction

| Code in this directory | Uses these technologies                             |
| ---------------------- | --------------------------------------------------- |
| `src/main`             | Electron, Node.js, SQLite, Graphviz, Electron CGI   |
| `src/renderer`         | React                                               |
| `src.net`              | .NET, `System.Reflection`, `ICSharpCode.Decompiler` |
| `.vscode`              | VS Code                                             |

### `src/main`

The main process is the controller:

- Uses the Node.js and Electron APIs
- Launches the src.net process to get reflected data
- Caches the data in a local SQLite database
- Loads the data from SQLite
- Formats the data as a view
- Launches Graphviz to render the data as an image
- Passes the data and the image to the renderer for display

UI events from renderer change the view options:

- Save the new options in SQLite
- Recreate the view with new options
- Send the new view to the renderer

### `src/renderer`

The renderer process implements the UI (using React and TypeScript).

### `src/shared-types` and `src/preload`

These define the APIs -- the methods and data -- between the renderer and main processes.

### `src.dotnet/`

The .NET process uses the Reflection API, to read the APIs (i.e. the interfaces and classes) and the API calls,
from the system which you're browsing.

It also uses `ICSharpCode.Decompiler` to decompile all method bodies, in order to list all API calls.

### `.vscode`

This defines a `launch.json` to debug the main process and/or the renderer.

## Third-party components

### SQLite

The SQLite component caches the API data which the .NET component reads.
It also stores any user-configurable display options.

### Graphviz

The Graphviz process creates image files of the selected APIs, to be displayed by the renderer.

### Electron

This toolkit lets you write code which runs:

- In a window, using a browser engine (e.g. using React, and/or HTML, CSS, JS, etc.)
- In another 'main' process, which can access the Node API and the local file system etc.
- Between the two, application-specific APIs to exchange data between the main process and the browser window

### Electron CGI

This package lets you invoke an external process from the Electron application
and communicate with it via JSON over the standard input and output streams.
I use it to communicate with the .NET process.

### Electron Forge

This is scripts and config files to build and package an Electron application like this one.

### React

The renderer component uses React.

### Npm components

The renderer code uses these React components from npm:

- `split-pane-react`
- `react-image-mapper2`
- `react-checkbox-tree`

The main (i.e. backend) code uses these:

- `better-sqlite3`
- `xml-js`
- `electron-cgi`

### Icons

A README in the `./icons` folder lists the provenance of the icons in this application.

## Application data

Hopefully the code is self-explanatory, when you understand the Third-party components listed above.

So without explaining code, here is some explanation of the application data i.e. the "domain knowledge".

### Reading reflection data

The solution uses a C# application i.e. `src.net/Core` to read metadata from .NET assemblies via reflection.

There seem to be three ways to do this:

- Dynamic-loading assemblies using the `System.Reflection.Assembly.LoadFrom` method.

  This doesn't work well, so this solution doesn't use it,
  e.g. a .NET Core application cannot load a .NET Framework assembly and vice versa.

- Using the `System.Reflection.MetadataLoadContext.LoadFromAssemblyPath` method

  This is used in the `Core.AssemblyLoader` and `Core.TypeReader` classes to read the type and method declarations.

- Using the `ICSharpCode.Decompiler` which uses the `System.Reflection.Metadata.MetadataReader` class

  This is used in the `Core.MethodReader` class and `Core.IL` assembly to decompile the method bodies.

The two which are used used --
`System.Reflection` and `System.Reflection.Metadata` --
are different technologies.
The latter is newer and reads the PE file more directly somethow.

It's unfortunate,
that this solution uses both,
and that the latter is used only indirectly,
i.e. via `ICSharpCode.Decompiler`.
This is for historical reasons,
i.e. I started using the traditional `System.Reflection` API,
and then I used `ICSharpCode.Decompiler`to help decompile method bodies.

### Development tools

These were useful during development and debugging:

- The `ILSpy` application including:

  - Mixed `IL with C#` (on the toolbar)
  - Disabling options to see compiler-generated types:

    - Decompile anonymous methods/lambdas
    - Decompile async methods

- JSON files, which `Core.exe` creates if you run it as a standalone application instead of an Electron CGI component.

- The "Errors" view of the application, to inspect detailed error data from the C# `MethodFinder` class

- The "Compiler" view of the application, to inspect detailed error data from the TS `compilerMethods.ts` component

### Metadata tokens

The compiler creates and uses numeric "Metadata tokens", to identify every type and method in the assembly.

Each token is unique within a given assembly,
and mapped to another (locally unique) value when it's imported from another assembly.

This solution reads these token values with the other reflection data,
and uses them (with assembly names) as unique keys in the SQLite database tables.

### Decompiling methods

The whole point of this solution is:

- Find which other methods are called by each method
- Use this to create a graph of all API calls

The `MethodBody` is available when an assembly is loaded by the `LoadFromAssemblyPath` method,
however it's IL format and non-trivial to parse.

So I use `ICSharpCode.Decompiler` to parse it.
This is large and I don't know it well.
It decompiles into types like `IMethod` and `IType`, which are like but not the same as `Type` from the Reflection API.

So:

- `Core.TypeReader`:
  - Reads `Type` instances from the Reflection API
  - Converts them to `TypeInfo` and `MethodMember` in the `Core.Output` namespace
- `Core.IL.Decompiler`:
  - Reads `IMethod` and `IType` instances fom `ICSharpCode.Decompiler`
  - Converts them to `TypeId` and `Method` types in the `Core.IL.Output` namespace
- `Core.MethodDecompilerExtensions` converts from `Core.IL.Output` types to `Core.Output` types
- `Core.MethodFinder`:
  - For each method returned by the decompiler
  - Find the corresponding method in the data returned by the type reader
  - Get the method's metadata token from the type reader's data
  - Return the metadata token in the output, to identify the called method

### Could be simpler

The `MethodFinder` implementation is complicated and error-prone:

- It exists because I don't know how to get the metadata token from the `ICSharpCode.Decompiler` types
- Even if I could it might be a local token value, which needs to be converted to token's value in the target assembly
- Instead of using `ICSharpCode.Decompiler`, perhaps I now know enough to parse the `IL` opcodes and metadata myself

### Generic methods

The most complicated part of `MethodFinder` is:

- `TypeReader` returns the declarations of generic types and methods, with their generic parameters e.g. `<T>`
- `Decompiler` returns calls to specialized generic types and methods, with specific arguments replacing the parameters

So to find a match, `MethodFinder` substitutes the specific arguments into the generic declarations before comparing.

### Compiler-generated types

Another complication -- inherent in the IL and therefore unavoidable -- is that the compiler generates types:

- To implement anonymous delegates
- To implement async method calls
- ... and maybe more TBD?

So the compiler:

- Defines the type, with methods which wrap the anonymous code fragment
- Instantiates and calls the type in the user-defined method which defines the code fragment

We don't want to display these compiler-defined types to the user.
Instead we display as if the methods of the compiler-defined types are identical to the user-defined method
in which or from which the compiler-defined type is called.

So the code in the `compilerMethods.ts` module finds which user-defined method each compiler-defined type belongs to:

- Because it's called from the user-defined method
- Because the user-defined method passes it as an argument e.g. to a method like `Where`
- Because the user-defined method has it as a local variable

### Microsoft assemblies

The solution avoids reflecting Microsoft assemblies, i.e. the .NET Core or .NET Framework assemblies, because:

- They're large, and mostly unused by any given application
- I assume you needn't see how they're implemented in detail
- They may be difficult to disassembly, throwing exceptions
