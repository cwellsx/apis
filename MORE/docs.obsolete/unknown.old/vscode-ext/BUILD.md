## Building

The configuration files to build this project
were created from the VS Code extension template
which was generated using `yo code` including the `webpack` option.

That would normally use these scripts in package.json to build:

```json
  "scripts": {
    "vscode:prepublish": "npm run package",
    "compile": "webpack",
    "watch": "webpack --watch",
    "package": "webpack --mode production --devtool hidden-source-map",
    "compile-tests": "tsc -p . --outDir out",
    "watch-tests": "tsc -p . -w --outDir out",
    "pretest": "npm run compile-tests && npm run compile && npm run lint",
    "lint": "eslint src",
    "test": "vscode-test"
  },
```

The `webpack.config.json` specifies the input and output

```js
  entry: './src/extension.ts'
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js'
  },
```

I modified this to also build React code to use in a webview:

- Input folder: `src.tsx`
- Output folder: `media`

One way to implement this might have been:

- Separate `tsconfig.json` in `src` and `src.tsx` folders
- Multiple `tsc` calls in the `scripts`

However instead, because the build scrips use `webpack` instead of `tsc`:

- Separate `webpack.config.js` and `webpack.webview.js`
- Multiple `webpack` calls in the `scripts`

In theory I could have a single `tsconfig.json` but for clarity
I prefer to have two separate ones.

## Debugging

I control the Electron app from the command-line by running npm scripts.

Whereas this VS Code extension is developed within VS studio.

To build and debug, press F5:

- `launch.json` defines "Run Extension" including

  ```
  "preLaunchTask": "${defaultBuildTask}"
  ```

- `tasks.json` defines two tasks i.e. `watch` and `watch-tests`

  ```
  "group": {
      "kind": "build",
      "isDefault": true
  }
  ```

## React in the Webview

If React is added to the Webview then it's necessary to have two builds.

- Two `webview.*.js` files with different input and output directories
- Modify the scripts to build both using

  - `concurrently`
  - `&`
  - a custom orchestrator e.g. like the 'electron-forge' build script

- Possibly modify `tasks.json` to build one or the other

The 'watch' becomes more complicated.

And webpack doesn't support incremental build (i.e. don't rebuild if it's already up-to-date).

## Avoiding React

Looking at `Graph.tsx` in the Electron app I see its purpose is:

- Mouse events like on click and on hover
- Changing boundary colors
- Changing the size of the image and recalculating the coordinates of the image map

This can be done with SVG and CSS instead.

CSS uses a rectangular bounding box
whereas mouse events use the actual shape of SVG e.g. circle and polygon
so the behaviour is implemented with a listener.

The listener is implemented in TS and compiled to JS.
The compilation doesn't happen often so it's simply a `*.cmd`.
