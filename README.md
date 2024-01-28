# API Viewer

This application browses the APIs of the components in a solution, with the call stacks or dependencies.

- [Installation](./docs/INSTALLATION.md)
- [User interface](./docs/USER.md.md)
- [System design](./docs/DESIGN.md)

## User interface

The user interface has three panes:

- Left -- a list of the components in the solution being browsed
- Centre -- the selected components and their APIs
- Right -- details of the selected API

When you select a component in the left-hand pane then it's displayed in the centre with its immediate neighbours,
i.e. with the components which it calls and the components which call it.

The components are displayed as a directed graph.

The graph can be panned and zoomed.

The graph is clickable, which is implemented using Graphviz image maps.
