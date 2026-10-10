# To Do

And `./MORE/*`

## Near term

- Reimplement - custom data
- Debug - delete state of descendents on ancestor state change
- Debug - add namespaces to tree
- Refactor - remove viewGraph.tsx and move React elements into .\tabs folder
- Refactor - combine the SVG elements with their containers
- Debug - hourglass and prevent overlapping input events from user
- Test - "references" ViewType
- Implement - webit api instead of setting em size to change zoom `const { webFrame } = require('electron'); webFrame.setZoomFactor(1.2);`
- Test - TPOSS
- Delete - GraphFilter class
- Implement - group isMicrosoft assemblies and make these invisible and non-expanded by default
- Implement - add styles e.g. to distinguish synthetic groups from assemblies or namespaces
- Implement - assembly details and call graphs for Core data
- Reimplement - arbitrary custom data

## Medium term

- Implement - network APIs
- Experiment - Cline

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

## https://github.com/caplin/FlexLayout

Use this to split the Electron window into areas.
