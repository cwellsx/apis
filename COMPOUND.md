I have projects in a monorepo. Two have their own package.json with scripts and webpack builds etc. There's one other folder called "backend" which only contains shared source code -- and has no configuration files of its own. Each package's build also references code in the backend folder e.g. this is one of the tsconfig.json

{
"compilerOptions": {
"module": "Node16",
"target": "ES2022",
"lib": ["ES2022"],
"sourceMap": true,
"rootDirs": ["src", "../backend/src"],
"strict": true,
"baseUrl": ".", // needed when paths is specified
"paths": {
//"backend": ["../backend/src/index.ts"],
"backend/_": ["../backend/src/_"]
}
},
"exclude": ["src.webview"],
"include": ["src", "../backend/src"]
}

Tell me about creating a tsconfig for the backend instead of one tsconfig to cover both paths.
• Can I?
• Why would I?
• How would I change the webpack?

---

Yes — you can create a dedicated tsconfig for backend

Create a tsconfig (e.g. packages/backend/tsconfig.json) that describes the shared code as its own TypeScript project. Then have each package reference or import that project instead of lumping backend sources into their package tsconfig include/rootDirs.

Why you would do this (benefits)

Correct separation of concerns — backend is an explicit TypeScript project with its own compiler options, includes, and excludes.

Faster incremental work — smaller per-package Programs are faster for editors and typed linting than one giant Program that includes everything.

Better type correctness across packages — use project references / composite builds so TypeScript can produce and consume declaration output cleanly rather than relying on rootDirs/path shims.

Clearer build outputs — backend can emit its own output (declaration files) and be consumed as a package, removing runtime ambiguity.

Easier tooling — editors, ESLint typed rules, and CI can point to the correct tsconfig without special-casing includes for external folders.

Two recommended architectures (with tradeoffs)

Simple reference (no project references)

Backend has tsconfig.json but you keep using path-mapping in consumer tsconfig to import "../backend/src".

Good when you want minimal change and live-edit of backend sources during app development.

Tradeoff: you still rely on consumer builds to ingest backend sources directly (no separate emit), and type checking can be duplicated.

Project references + composite builds (recommended for long-term)

Backend tsconfig has "composite": true and outputs declarations to dist; consumers add "references": [{ "path": "../backend" }] or list backend's tsconfig in parserOptions.project for ESLint.

Consumers import the package (or use path mapping to dist during dev or use workspaces that resolve the workspace package).

Benefit: single authoritative type output; faster incremental TS builds and clearer package boundaries.

Tradeoff: slightly more setup; you must build referenced projects (tsc --build) for declaration outputs before consumer build unless you enable incremental dev tooling.

Minimal example tsconfig for backend (packages/backend/tsconfig.json)

{
"compilerOptions": {
"composite": true,
"declaration": true,
"declarationMap": true,
"outDir": "dist",
"target": "ES2022",
"module": "Node16",
"strict": true
},
"include": ["src/**/*"]
}

Consumer package tsconfig (packages/electron-app/tsconfig.json) — two approaches:

A) Reference the backend project (project references)

{
"compilerOptions": {
"module": "Node16",
"target": "ES2022",
"composite": false
},
"references": [
{ "path": "../backend" }
],
"include": ["src/**/*"]
}

B) Keep source-level editing (path mapping) but rely on backend tsconfig for tooling

{
"compilerOptions": {
"paths": { "backend/_": ["../backend/src/_"] },
"baseUrl": "."
},
"include": ["src/**/*", "../backend/src/**/*"]
}

How to change Webpack so consumers still build correctly

You must ensure webpack transpiles or resolves backend sources consistently with how it treats local package sources.

If webpack should compile backend source files directly (source-level dev)

Make the loader include the backend src folder and ensure tsconfig paths are honored:

// webpack.config.js (consumer package)
const path = require("path");

module.exports = {
// ...
resolve: {
alias: { "backend": path.resolve(**dirname, "../backend/src") }, // optional convenience
extensions: [".ts", ".tsx", ".js"]
},
module: {
rules: [
{
test: /\.tsx?$/,
use: [
{
loader: "ts-loader",
options: {
transpileOnly: true, // use fork-ts-checker for type checks
projectReferences: true // if using project references
}
}
],
include: [
path.resolve(**dirname, "src"),
path.resolve(**dirname, "../backend/src") // must include backend sources
]
}
]
},
plugins: [
// If using transpileOnly: use fork-ts-checker-webpack-plugin and point it at both tsconfigs
new (require("fork-ts-checker-webpack-plugin"))({
typescript: {
configFile: path.resolve(**dirname, "tsconfig.json"),
// If you want it to check backend too, point to multiple projects or use project references
build: true
}
})
]
};

Ensure loader resolution and Babel/TS options align with backend tsconfig (module, target, jsx, paths).

If backend is built as a compiled package (composite + dist)

Change webpack to import the package via its package name (workspace resolution) and not the source folder:

Build backend (tsc -b) or let your monorepo tool run incremental builds.

Configure webpack alias or module resolution to prefer the workspace package main (dist). Example: no extra include; imports resolve to "packages/backend" which points to dist via package.json "main"/"types".

This is the cleanest for CI and matches how npm consumers work.

Resolve tsconfig path mappings in webpack

If you rely on tsconfig "paths" for imports, use tsconfig-paths-webpack-plugin or configure corresponding webpack aliases:

const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

resolve: {
plugins: [ new TsconfigPathsPlugin({ configFile: path.resolve(__dirname, 'tsconfig.json') }) ]
}

This makes TypeScript path aliases work at bundle time.

Ensure loaders and type-checkers point at the right tsconfigs

ts-loader: set configFile to consumer tsconfig or enable projectReferences to have it resolve referenced projects.

fork-ts-checker-webpack-plugin: point it at multiple tsconfigs or rely on project references so it checks the whole graph.

Practical migration steps

Create packages/backend/tsconfig.json (composite if you want emits).

Decide dev workflow:

Option A: keep source-level editing — add backend src to each package's webpack loader include and keep paths mapping; also point ESLint parserOptions.project to both tsconfigs if you need typed linting across both.

Option B: publish/build backend as package — add references in consumer tsconfig and ensure webpack resolves package main to the built dist during bundling. Add a top-level script for building referenced projects (tsc -b).

Update webpack in each consumer:

If compiling backend sources, include backend src in ts-loader include and adjust resolve aliases or tsconfig paths plugin.

If consuming the built backend, ensure package.json of backend points to dist and webpack resolves to that package output.

Update tooling:

ESLint parserOptions.project: list the package tsconfig plus backend tsconfig (or point tsconfigRootDir appropriately).

CI: ensure build order if using project references (build backend first).

Caveats and tips

Editor/TS server picks a tsconfig based on file location; adding a backend tsconfig clarifies the editor behavior for backend files.

Typed ESLint rules need parserOptions.project to include the backend tsconfig if you want type-aware linting for backend sources.

Avoid including huge numbers of unrelated files in a single tsconfig; prefer per-package tsconfigs for performance.

If you use project references, run tsc -b or configure your build system to run referenced builds incrementally.

If you tell me which consumer package you want to change first (electron-app or vscode-ext), which webpack loader you use (ts-loader, babel-loader with @babel/preset-typescript), and whether you want the backend to emit dist/declarations, I’ll produce the exact tsconfig files and the concrete webpack changes you can paste into that package.

---

I think the problem with composite builds is debugging. If one is built and then another, then the run-time of the second is using the JS not the TS of the first and so the map file of the second references the JS of the first -- I don't get typescript-source debugging of both.

---

Problem summary

When you build project A (backend) to JS and then build project B (consumer) that consumes A’s emitted JS, the runtime used by B is the built JS for A. Source maps emitted by B will point at A’s JS unless A produced declaration and source maps that map back to the original TypeScript and B is configured to consume those maps. The net result is you lose a seamless TypeScript-to-TypeScript debugging experience across projects.

Why this happens

Project references with separate builds produce separate outputs. The consumer sees the backend’s compiled JS as the canonical runtime artifact.

By default the backend’s .map files map its JS back to its TS only if those maps are emitted and discoverable. If the consumer bundles the backend JS without preserving or resolving those source maps, the debugger only sees JS.

Even when maps exist, incorrect sourceRoot, mapRoot, or webpack devtool settings cause the debugger to resolve to built JS files instead of original TS sources.

Many toolchains replace import paths to the backend package’s JS entry, so consumer source maps point to those JS modules rather than the backend TS sources.

Two robust approaches to get TS-to-TS debugging

Compile and bundle both projects together during development (recommended for debug ergonomics)

Let the consumer’s bundler (webpack) compile backend TS source directly instead of consuming backend’s JS output.

Practical changes:

Add backend src to the bundler’s loader include so ts-loader or babel-loader processes it.

Use tsconfig path aliases or webpack alias to point imports to backend/src.

Use a dev-only webpack config that resolves backend source rather than dist.

Ensure webpack devtool is a high-fidelity mode, for example "source-map" or "eval-source-map" for fast rebuilds.

Use source-map-loader if you need to re-process upstream source maps.

Result: debugger sees original TS files for both projects, breakpoints bind correctly, and single-step works across project boundaries.

Keep separate builds but emit high-quality maps and declaration maps so consumer can map to backend TS

Backend tsconfig:

"composite": true

"declaration": true

"declarationMap": true

"sourceMap": true

"inlineSources": true or ensure original sources are accessible on disk and sourceRoot points to them

Consumer build:

Ensure the consumer’s bundler preserves and consumes the backend source maps. Enable source-map-loader to load upstream maps.

Configure webpack devtool that preserves original sources.

Make sure the backend build output includes .map files adjacent to .js and that the debugger can locate the backend TS files using paths encoded in the source maps.

Important extras:

Use declarationMap so editors can jump from consumer code into backend TS declarations and trace to implementation.

Set compilerOptions.sourceRoot or mapRoot so source maps reference TS sources with correct relative paths. Use absolute or repository-root-consistent URLs if needed.

Concrete settings and commands

A. Backend tsconfig.json (emit maps and declaration maps)

{
"compilerOptions": {
"composite": true,
"declaration": true,
"declarationMap": true,
"sourceMap": true,
"inlineSources": true,
"outDir": "dist",
"module": "Node16",
"target": "ES2022"
},
"include": ["src"]
}

B. Consumer webpack (compile backend source during dev)

Include backend src in loader include and enable ts-loader projectReferences for better resolution:

module.exports = {
devtool: "eval-source-map", // or "source-map" for slower builds with higher fidelity
module: {
rules: [
{
test: /\.tsx?$/,
use: { loader: "ts-loader", options: { projectReferences: true } },
include: [
path.resolve(__dirname, "src"),
path.resolve(__dirname, "../backend/src")
]
}
]
},
resolve: {
extensions: [".ts", ".tsx", ".js"],
alias: { /_ optional alias "backend": path.resolve(\_\_dirname, "../backend/src") _/ }
}
};

C. Consumer webpack (if consuming backend built output)

Ensure upstream maps are consumed:

module.exports = {
devtool: "source-map",
module: {
rules: [
{ test: /\.js$/, enforce: "pre", use: ["source-map-loader"], include: /node_modules|dist/ }
]
}
};

Ensure backend distribution includes .map and .d.ts.map files and that paths in the maps point to the original TS sources.

Tooling tips and tradeoffs

Developer velocity vs reproducibility:

Compiling backend source in consumer yields the best DX for debugging and hot-reload but diverges from a publishable build pipeline.

Separate builds with high-quality maps preserve a publishable artifact and can work for debugging but require careful path configuration and more build orchestration.

Use projectReferences with incremental builds to speed full builds while still allowing source-level debugging when you compile together in dev.

Prefer inlineSources in dev to avoid missing-source problems in debugger; disable inlineSources in CI for smaller map files.

If you use VS Code debug, confirm the launch.json sourceMapPathOverrides match the repo layout so the debugger can locate TS sources referenced by the maps.

Quick checklist to restore TS debugging across projects

Decide dev mode: compile backend sources in consumer or consume backend outputs with declaration+source/declarationMaps.

If compiling sources in consumer: include backend/src in ts/webpack loaders and set devtool to a source-map mode.

If consuming built outputs: enable backend declarationMap, sourceMap, inlineSources or correct sourceRoot, and ensure consumer uses source-map-loader and devtool that preserves original sources.

Restart the debug session and verify breakpoints bind to TypeScript files for both projects.

If breakpoints still map to JS, inspect the emitted .map files to confirm their sources and sourceRoot point to the original .ts locations.

Tell me which workflow you want for development (compile backend source in consumer or keep separate builds and consume maps) and which bundler/loader you use. I will produce the exact tsconfig, webpack loader config, and VS Code launch.json sourceMapPathOverrides to make TypeScript debugging seamless.
