## Debugging

Some of the targets in `.vscode/launch.json` are to debug this:

- Electron Main -- debug the backend
- Electron All -- debug the backend and front-end

The front-end can be debugged using VS Code like this,
and/or using the Chrome DevTools.

The two are more-or-less as good -- both can set breakpoints in TypeScript source.

The VSCode debugger takes a while to bind after the renderer starts
so breakpoints aren't effective immediately.

If you need to debug the startup sequence, try adding a `debugger;` statement to the startup sequence.
