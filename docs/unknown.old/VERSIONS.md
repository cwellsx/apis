Current version of my VS Code as shown in Help/About is as follows:

- Version 1.105.1
- Electron 37.6.0
- Node.js 22.19.0

The version matches the label of the latest release:

- https://github.com/microsoft/vscode/releases

Whenever the Electron version changes,
sqlio must be rebuild,
with a new version passed to electron-rebuild in its package.json

- [package.json](./packages/sqlio/package.json)

Something like this might be used to automate the rebuild

- https://github.com/ewanharris/vscode-versions

This is similar but out-of-date because its builds have stopped

- https://github.com/Sneezry/vscode-version-watcher

What matters is the ABI version.

The ABI versions are listed e.g. here:

- https://github.com/nodejs/node/blob/main/doc/abi_version_registry.json

This suggests that perhaps the ABI changes only with changes to the major version of Electron
but Copilot claims that it might change at any time.

Get the current version using `electron --abi` for example

```
C:\Dev\apis>npm run show-abi -w apis

> apis@0.1.0 show-abi
> electron --abi


136
```

## @types/node

The version of @types/node doesn't correspond exactly to the version of node.

You should use the highest revision of @types/node that corresponds to the major version of node.

For example if the version of node is 22.x then the version of @types/node can be found with this Powershell

```powershell
(npm view @types/node versions --json | ConvertFrom-Json) | Where-Object { $_ -match '^22\.' } | Sort-Object {[version]$_} -Descending | Select-Object -First 1
```

For example:

```
PS C:\Users\cwell> (npm view @types/node versions --json | ConvertFrom-Json) | Where-Object { $_ -match '^22\.' } | Sort-Object {[version]$_} -Descending | Select-Object -First 1
22.18.12
PS C:\Users\cwell>
```

## reinitialize.cmd

After you run reinitialize.cmd the git status --ignored command
should show there's only one one node_modules in the monorepo
i.e. none under the electron-app or vscode-ext folders.

If there are more, that implies npm couldn't hoist all dependencies
because of conflicting versions
so review the non-hoisted dependencies
and include them in the list of overrides.
