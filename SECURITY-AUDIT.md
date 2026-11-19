# Security audit

The findings at the time of writing, from `npm audit` on the current version of the lock file. The policy for
evaluating them, and the commands that produce this, are in
[`docs/architecture/AUDIT.md`](./docs/architecture/AUDIT.md).

This is a snapshot rather than a maintained document, and it is superseded rather than extended. Git holds the
previous ones.

## Findings

| name                                   | severity | isDirect | range                                                  |
| -------------------------------------- | -------- | -------- | ------------------------------------------------------ |
| `@electron-forge/plugin-webpack`       | moderate | True     | >=6.0.0-beta.9                                         |
| `@typescript-eslint/eslint-plugin`     | moderate | True     | 6.16.0 - 8.72.2                                        |
| `@typescript-eslint/parser`            | moderate | True     | 6.16.0 - 8.72.2                                        |
| `@typescript-eslint/type-utils`        | moderate | False    | 6.16.0 - 8.72.2                                        |
| `@typescript-eslint/typescript-estree` | moderate | False    | 6.16.0 - 8.72.2                                        |
| `@typescript-eslint/utils`             | moderate | False    | 6.16.0 - 8.72.2                                        |
| `@vscode/test-cli`                     | moderate | True     | \*                                                     |
| `copy-webpack-plugin`                  | moderate | True     | 6.1.1 - 13.0.1                                         |
| `diff`                                 | low      | False    | 6.0.0 - 8.0.2                                          |
| `electron`                             | high     | True     | <=42.11.15 &#124;&#124; 43.0.0-alpha.1 - 43.0.0-beta.8 |
| `electron-cgi`                         | moderate | True     | \*                                                     |
| `electron-mocha`                       | moderate | True     | >=13.1.0                                               |
| `extract-zip`                          | high     | False    | \*                                                     |
| `glob`                                 | moderate | False    | 9.0.0 - 14.0.1                                         |
| `minimatch`                            | moderate | False    | 7.0.0 - 11.0.0                                         |
| `mocha`                                | moderate | False    | >=8.2.0                                                |
| `serialize-javascript`                 | high     | False    | <=7.1.2                                                |
| `sockjs`                               | moderate | False    | >=0.3.17                                               |
| `typescript-eslint`                    | moderate | True     | <=8.72.2                                               |
| `uuid`                                 | moderate | False    | <11.1.1                                                |
| `webpack-dev-server`                   | moderate | False    | 2.0.0-beta - 5.2.7                                     |

## Evaluations

### @typescript-eslint

An update to 8.73 exists. Dev-only, and the one item on this list that can be cleared now.

### @electron-forge/plugin-webpack

Dev-only, and already the latest — 8.0.1. Wait for a future release; the findings beneath it (`sockjs`,
`uuid`, `webpack-dev-server`) resolve with it.

### electron-cgi

Unsupported. To be replaced with [a simpler implementation](./MORE/ELECTRON-CGI.md).

### electron

High, and cleared by the upgrade to Electron 45 — see
[`MORE/ELECTRON-UPGRADE.md`](./MORE/ELECTRON-UPGRADE.md).

### mocha / electron-mocha

A dev tool with no corrected version yet. Waiting is the answer — unless `backend-test` stops running under
Electron, which the `node:sqlite` work would allow, at which point `electron-mocha` is no longer needed at all.

### ... plus others TBD
