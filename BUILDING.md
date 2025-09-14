# Monorepo with two projects

This is a "monorepo" which is used to build two projects.

| Folder                  | Workspace  |
| ----------------------- | ---------- |
| `packages/electron-app` | `apis`     |
| `packages/vscode-ext`   | `sys-view` |

The "workspace" name is defined in the the "name" field in that project's `package.json` -- it is not the folder name:

- `apis` in [packages/electron-app/packages.json](packages/electron-app/packages.json)
- `sys-view` in [packages/vscode-ext/packages.json](packages/vscode-ext/packages.json)

The "workspace" name is used in npm commands e.g.

- `npm run <script-name> -w <workspace>`
- `npm run <script-name> -workspace=<workspace>`
- `npm install <package-name> --workspace=my-app`

The two projects are minimally coupled -- each has its own independent and self-contained tsconfig and webpack configuration.

The build configurations for the two were created separately from the following templates:

| Project      | Template       |
| ------------ | -------------- |
| electron-app | Electron Forge |
| vscde-ext    | `yo code`      |

The reason why the two are in one monorepo is so that they can share the code which is now contained in the `packages/shared` folder.
This code is included in both via the webpack configuration of both projects.

There's a single `.vscode` folder in the root of the repo.

- This includes a `launch.json` with configurations for both applications.
- To build-and-debug one component or another, run F5 with one of targets.
- Or to build, package, lint, etc., use `npm run` on the command-line.
