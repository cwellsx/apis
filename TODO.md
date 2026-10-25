# To Do

And `./MORE/*`

## Near term

- Implement - add styles e.g. to distinguish synthetic groups from assemblies or namespaces
- Implement - assembly details and call graphs for Core data
- Debug - hourglass and prevent overlapping input events from user
- Implement - webit api instead of setting em size to change zoom `const { webFrame } = require('electron'); webFrame.setZoomFactor(1.2);`

## Medium term

- Implement - network APIs
- Experiment - Cline
- Debug/Reimplement - custom data

## Backend alias

Create tsconfig.paths.json

Reference it using `extends` in the tsconfig.json of other projects like backend-test

Use it to define path aliases using `paths`

- `@contracts-app: ["./contracts/app"]`
- `@src-id: ["./src/id2"]`
- `@src-utils: ["./src/utils"]`

## https://github.com/caplin/FlexLayout

Use this to split the Electron window into areas.
