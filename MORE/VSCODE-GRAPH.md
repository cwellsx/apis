# The webview graph

Porting the Electron app's graph UI into `vscode-ext`'s webview, once the Electron version is worth porting. The
webview's `script.ts` is a steel thread — it proves the pipeline works (compile, inject SVG, handle mouse events,
post messages out) and does nothing else. Everything since has gone into the Electron app.

Written to be reviewed before the work starts. Delete it when the work is done.

## Why it is feasible

**React is not an obstacle.** A webview is our own HTML, so it can bundle React, the CSS and `backend-ui` like
any page. `src.webview` already has its own `tsconfig.webview.json` and its own `compile.cmd`, run by
`precompile`, `prewatch` and `prepackage` — it is already a separate compilation unit, so this is a build
configuration change rather than an architectural one.

**The components are already host-agnostic.** `Graph.tsx` takes `onGraphEvent` and `onWheelZoomPercent` as
props and never touches `ipcRenderer`; `EdgePopup` takes `info` and renders it. Neither knows it is in Electron.
That is not luck — it is the same discipline as `SelectedView` and the `open*` split: decide in one place, inject
the host's capability.

## What differs between the hosts

|           | Electron                       | VS Code                              |
| --------- | ------------------------------ | ------------------------------------ |
| sending   | `preload.ts` → `ipcRenderer`   | `acquireVsCodeApi().postMessage`     |
| receiving | `shared.ts` → `ipcRenderer.on` | `window.addEventListener("message")` |
| the tree  | our own `nodes/TreeView`       | VS Code's tree API — **not ported**  |
| state     | the renderer's `App.tsx`       | the extension host                   |
| the graph | `Graph.tsx`                    | `Graph.tsx`, unchanged               |

The two message APIs have the same shape — send a message, receive a message — which is why an adapter is
enough.

## What to keep true, starting now

1. **Host calls stay outside the graph components.** `onGraphEvent` is a prop and must not become a direct
   `ipcRenderer` call inside `Graph.tsx`. **The temptation arrives with the node popup**, which will want to
   _ask_ for detail rather than be _given_ it. Keep it given: the edge popup's data arrives with the render, and
   the node popup should follow that shape.
2. **`acquireVsCodeApi()` belongs in the adapter.** It is at the top of `script.ts` now, which is fine for a
   steel thread, but no graph component may call it, nor anything Electron-specific.
3. **The types stop being duplicated.** `src.webview/ipc.d.ts` exists only because a script with no imports
   cannot reach `backend-ui`. A bundled webview can import it exactly as the renderer does, so the shared types
   become genuinely shared rather than mirrored.

## On React and boundaries

React enforces **props down, callbacks up** — a component cannot reach into a parent's state. It says nothing
about **module imports**, so it does not stop a component reaching _outward_ to a global: `import { ipcRenderer }
from "electron"` inside a handler is perfectly legal React.

So the boundary that matters is **the import graph**, and it is visible: a file that does not import the host
cannot call it. Worth keeping an eye on when the popups grow, and it is the kind of thing a lint rule
(`no-restricted-imports`) can hold if it ever slips.

What React _does_ make tedious is not the callback but **threading it** — passing a handler down through
several layers, with `useCallback` to keep it stable. Hooks are the escape: `useKeyboard` reaches app state
without a prop, and stays portable because it is a plain DOM listener.

## Steps, when the time comes

1. Make the webview a webpack target that imports React, `backend-ui` and the graph components.
2. Write the host adapter — `postMessage` out, `message` in — implementing the same small interface the Electron
   side does.
3. Port `Graph` and the popups unchanged. They take props and call callbacks; that is all they do.
4. Keep the tree in VS Code's own API.

Steps 1 and 2 are the work. Step 3 is the payoff for a decision already made.

## Out of scope

- **The tree.** VS Code has its own tree views, and they are the better answer there.
- **The panels** — options, details, text views. Each host renders its own.
- **`script.ts`.** It is a steel thread, and the port replaces it rather than extending it.

## The thing that would break this

A graph component that **fetches** its own data. The moment a popup calls out for its detail, it needs the host,
and the port becomes a rewrite of every call site. Keep the data arriving with the render, and the port stays a
build change plus an adapter.

---

> Designing a vscode extension is it plausible to have react in a webview? Do other extentions do that? Are there exemplars of how to build/bundle it (separately from the "backend" presumably)?

Yes, building a VS Code extension webview with React is standard practice and widely supported. Many popular extensions use this exact architecture to create rich, interactive user interfaces inside the editor.

Popular Extensions Using React

Several well-known extensions rely on React (or similar frameworks) inside their webviews:
• GitLens: Uses React to power its interactive commit graphs, visual file histories, and settings UI.
• Thunder Client / Postman: Relies on webviews with modern frontend frameworks to render complex API request builders and response viewers.
• Cline / Continue (AI Coding Assistants): Use React inside the sidebar webview to render chat interfaces, code diffs, and interactive agent workflows.
• Jupyter: Uses React to render interactive notebook cells, data viewers, and variable explorers.

How the Architecture Works

A VS Code extension runs in two completely separate environments that cannot directly share memory or DOM access:
• Extension Host (The "Backend"): Runs in a Node.js environment. It handles VS Code API calls, file system access, terminal commands, and heavy logic.
• Webview (The "Frontend"): Runs in an isolated <iframe> (Chromium). It renders your React app and manages UI state.
• Communication: The two sides talk asynchronously using postMessage (webview.postMessage from the extension, and vscode.postMessage from React).

How to Build and Bundle It Separately

Because the extension host targets Node.js and the webview targets a browser, you must bundle them separately. The standard approach is to maintain two build pipelines within a single repository:
• Backend Bundler: Use esbuild or webpack to compile your TypeScript extension code (src/extension.ts) into a CommonJS bundle (dist/extension.js) targeting Node.js.
• Frontend Bundler: Use Vite or webpack to bundle your React code (webview-ui/src/main.tsx) into browser-ready assets (dist/webview/index.js and index.css).
• Loading in VS Code: Your extension reads the compiled JS and CSS paths using webview.asWebviewUri(), injects them into an HTML string along with a strict Content Security Policy (CSP), and sets webview.html.

Official & Community Exemplars

You do not need to configure the dual-bundler setup from scratch. You can reference or clone these maintained templates:
• Microsoft's Official Samples (vscode-webview-ui-toolkit / vscode-extension-samples): Microsoft's webview-sample and React webview templates demonstrate how to configure esbuild or webpack to output both targets and enforce proper CSP nonces. (Note: While Microsoft archived the @vscode/webview-ui-toolkit component library, their official webview architecture samples remain the gold standard for bundling and message passing).
• Vite + React VS Code Templates: Search GitHub for vscode-webview-react-vite (such as templates by community maintainers like tomjs or estruyf). These pre-configure Vite with Hot Module Replacement (HMR) so you can develop your React UI rapidly inside VS Code without manually rebuilding on every save.
• Open-Source AI Extensions (e.g., Cline): Checking the repository structure of Cline (saoudrizwan/claude-dev on GitHub) provides a real-world production example. It cleanly separates the root src/ (extension host) from webview-ui/ (Vite + React app) with shared TypeScript interfaces for message passing.

Key Gotchas to Plan For

• State Persistence: VS Code destroys webview iframes when the user switches tabs unless you enable retainContextWhenHidden: true (which uses more memory) or save state via vscode.setState().
• Theming: VS Code automatically injects CSS variables (like --vscode-editor-background and --vscode-button-background) into your webview. Use these in your React CSS so your UI seamlessly matches the user's light or dark theme.

If you share a bit more about your setup, I can point you to the best starter configuration or show you a code snippet for the bridge:

• Bundler preference: Do you prefer Vite (faster HMR for React) or esbuild/webpack (single-tool setup)?
• UI complexity: Are you building a sidebar panel (like a chat or tree view) or a full-editor tab (like a visual editor or dashboard)?

---

> 1. I don't know bundlers. Have no preference, take what's recommended, hope it simply works.
>
> 2. Probably "full" -- it's an interactive graph, a large SVG with popups, sending events on click into the backend, displaying software dependencies and call graphs.

For an interactive full-editor dependency and call graph, esbuild (for the backend) + Vite (for the React frontend) is the recommended setup, paired with a dedicated graph library like React Flow.
Because you are building a large interactive SVG with popups in an editor tab, standardizing the project structure and build pipeline upfront will save you significant debugging later.

1. The Recommended Stack & Build Setup

You do not need to learn bundler internals to make this work. The standard modern setup uses two fast, zero-config-friendly tools side-by-side:
• Backend (esbuild): Compiles your extension's Node.js code (src/extension.ts) into a single fast file (dist/extension.js). VS Code's official generator (yo code) now includes esbuild out of the box.
• Frontend (Vite): Bundles your React app (webview-ui/) into static assets (dist/webview/). Vite handles all the React/TypeScript compilation automatically and gives you instant Hot Module Replacement (HMR) while designing your graph.
• Graph Library (@xyflow/react / React Flow): Instead of writing raw SVG pan, zoom, and node-dragging math from scratch, use React Flow. It renders interactive node-based graphs, handles thousands of nodes smoothly, and lets you render standard React components (like custom popups, tooltips, and badges) directly inside graph nodes.

2. Ideal Project Folder Structure

Keep the two environments completely isolated in your repository, sharing only a types.ts file so your message payloads stay strictly typed:

```
my-graph-extension/
├── src/                  # Backend (Node.js / VS Code API)
│   ├── extension.ts      # Registers commands & creates the WebviewPanel
│   └── graphParser.ts    # Analyzes code & builds dependency data
├── webview-ui/           # Frontend (Standard Vite + React app)
│   ├── src/
│   │   ├── App.tsx       # Your React Flow graph & popups
│   │   └── vscode.ts     # Tiny wrapper around acquireVsCodeApi()
│   ├── index.html
│   └── vite.config.ts    # Configured to output to ../dist/webview
├── shared/
│   └── types.ts          # Shared TypeScript interfaces for messages
└── package.json          # Runs both builds together
```

3. Essential Settings for a Full-Editor Graph

When creating a WebviewPanel (a full-editor tab) for a heavy visualization, three specific VS Code settings make the experience smooth:
• Keep the Graph Alive (retainContextWhenHidden: true): By default, VS Code destroys a webview's DOM when the user switches to another code tab and switches back. For a large graph with zoom state and open popups, set retainContextWhenHidden: true when calling vscode.window.createWebviewPanel(). This keeps your React state and zoom position intact in memory.
• Clean Click-to-Code Bridge: When a user clicks a node in React, fire vscode.postMessage({ command: 'openFile', file: 'src/auth.ts', line: 42 }). Your backend receives this and calls vscode.window.showTextDocument() with ViewColumn.One (opening the code side-by-side next to your graph in ViewColumn.Two).
• Native Look & Feel: Use VS Code's built-in CSS variables (var(--vscode-editor-background), var(--vscode-panel-border), var(--vscode-textLink-foreground)) for your graph canvas, edges, and popups so the visualization looks like a native feature regardless of the user's color theme.

How to Start Without Configuring Anything

1. Scaffold the Extension: Run npx --package yo --package generator-code -- yo code, choose New Extension (TypeScript), and select esbuild when prompted for a bundler.
2. Add the React App: Inside that new folder, run npm create vite@latest webview-ui -- --template react-ts to generate the frontend.
3. Wire Them Together: Add a single build script in your root package.json (npm run build:ext && npm run build:webview) so packaging the extension compiles both sides automatically.

Would you like me to provide:
• The exact vite.config.ts and extension.ts boilerplate needed to load the Vite bundle inside a VS Code WebviewPanel?
• A starter example of the typed postMessage bridge between React node clicks and VS Code opening files?
