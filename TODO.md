# To do

- Data - types in TypeScript:
  - APIs (i.e. class and interfaces)
    - type name
    - assembly name
    - access modifier
    - properties
      - name
      - type
    - methods
      - name
      - return type
      - parameters
    - base types
  - Calls
    - type name
    - method or property
    - called from class name
    - called from assembly name
- Data - types in SQLite (i.e. API and calls)
- .NET - methods
  - readTypesFromAssembly
  - readCallsFromAssembly
- SQLite - table I/O
- Data - add denormalized `access` column to record whether a call is different assemblies, same assembly, or same class
- UI - settings to create or select a database
  - Three empty panes
  - Settings button
  - On settings, get and show list of existing databases
  - Buttons to create new database or to open existing database
- UI - settings to populate a database
  - Directory picker dialog
  - Multiline `textarea` with blacklist of assemblies to ignore
  - Load or Reload button
  - Progress sliders for number of assemblies and number of kilobytes processed
- UI - list assemblies in left-hand pane
- Data - select or exclude an assembly (i.e. the state is picked, excluded, or auto)
- Data - format of `dot` file (in detail)
- Main - regenerate Graphviz `dot` file when selection changes
  - For each selected assembly, show called assemblies
    - List calls from selected assembly where `access` is different assemblies
    - Get types called, group types by called assembly
  - For each selected assembly, show calling assembly
    - List calls to selected assembly
    - Get type calling, group types by calling assembly
  - Exclude excluded assemblies -- using SQL or by post-processing
  - Add assemblies (as components) and called API types (as edges) to the `dot` file
- UI - settings to select the local directory in which Graphviz is installed
- Main - invoke Graphviz to process the `dot` file
- UI - display the generated call graph
- UI - change assembly selection state (i.e. picked, excluded, or auto)
- UI - select API to show in right-hand pane by clicking on an edge

## Estimated

| Task                                    | Days |
| --------------------------------------- | ---- |
| Data - types in TypeScript              | 1    |
| Data - types in SQLite                  | 1    |
| NET - methods                           | 5    |
| SQLite - table I/O                      | 2    |
| Data - denormalized `access` column     | 1    |
| UI - settings to select a database      | 3    |
| UI - settings to populate a database    | 2    |
| UI - list assemblies in left-hand pane  | 2    |
| Data - select or exclude an assembly    | 1    |
| Data - format of `dot` file (in detail) | 1    |
| Main - Graphviz `dot` file              | 2    |
| UI - Graphviz installation directory    | 1    |
| UI - display the generated call graph   | 1    |
| UI - change assembly selection state    | 2    |
| UI - select API by clicking on an edge  | 3    |
| Total                                   | 28   |

## Done

- Fork skeleton project, define README and TODO
