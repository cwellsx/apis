# To Do

And `./MORE/*`

## Near term

Sooner:

- Debug - delete state of descendents on ancestor state change
- Debug - add namespaces to tree
- Implement - group isMicrosoft assemblies and make these invisible and non-expanded by default
- Implement - add styles e.g. to distinguish synthetic groups from assemblies or namespaces
- Implement - assembly details and call graphs for Core data

Then:

- Debug - hourglass and prevent overlapping input events from user
- Implement - webit api instead of setting em size to change zoom `const { webFrame } = require('electron'); webFrame.setZoomFactor(1.2);`
- Test - TPOSS
- Delete - GraphFilter class

Later:

- Refactor - remove viewGraph.tsx and move React elements into .\tabs folder
- Refactor - combine the SVG elements with their containers
- Refactor - split viewState to *Common, *DotNet, and *Custom
- Improve - make custom data work better, maybe aggregate calls and/or remove folder-shaped nodes
- Reimplement - arbitrary custom data

## Medium term

- Implement - network APIs
- Experiment - Cline
- Debug/Reimplement - custom data

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

## Backend alias

Create tsconfig.paths.json

Reference it using `extends` in the tsconfig.json of other projects like backend-test

Use it to define path aliases using `paths`

- `@contracts-app: ["./contracts/app"]`
- `@src-id: ["./src/id2"]`
- `@src-utils: ["./src/utils"]`

## https://github.com/caplin/FlexLayout

Use this to split the Electron window into areas.
