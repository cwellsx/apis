## What

This folder has no package.json of its own.
Therefore it has not build of its own.
Instead these source files are included in the build of projects which use them.

## How

To do this, the folders are included in

- paths of tsconfig.json
- include of webpack config
- scripts of package.json

## Why

This is because, if they're built separately, it seems to be difficult to debug them:

- Its build emits JavaScript
- Projects which depend on it get its JavaScript via webpack
- The project's map file references the JavaScript
- Therefore debugging sees the JavaScript, not the TypeScript
