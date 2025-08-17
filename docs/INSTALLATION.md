---
title: Installation
nav_order: 3
layout: home
---

# Installation
{: .no_toc }

- TOC
{:toc}

<!-- - [Source code](#source-code)
- [Build your own executable](#build-your-own-executable)
- [Prebuilt executables](#prebuilt-executables)
- [Local certificate error](#local-certificate-error) -->


## Build tool prerequisites

`better-sqlite3` relies on `node-gyp` --
this needs both Python and C++ build tools on Windows,
so install both before running `npm install`.

The current verion of `node-gyp` requires a down-level versions of Python i.e. 3.10.
A way to fix this in future may be to use
https://www.npmjs.com/package/@electron/node-gyp
or eventually a later version of Electron.

## Install the source code

Installing the project's source code, to build it locally, should be simple:

```
git clone https://github.com/cwellsx/apis.git
cd apis
npm install
```

## Updating prerequisites

There's no automated way to update the Electron Forge dependendies
so just update them all to the new version.

Before you do this, I recommend you create a scratch version of the newest template:

    npx create-electron-app@latest trash --template=webpack-typescript

Then compare the current version with the new template:

    npm install --save-dev @electron-forge/cli@latest

## Build your own executable

After you install source code, run `npm run make` to build an executable which you can deploy.

I edited `forge.config.ts` so this builds a ZIP file.

The default was to create a `Setup.exe` using `Squirrel.Windows` -- see https://www.electronforge.io/config/makers

## Prebuilt executables

I could, but have not yet, posted prebuilt executables to GitHub.

## Local certificate error

When you run `npm install` you may see an error message related to a local certificate.

Google's search results for this error message suggests it may be caused by a corporate firewall
doing a man-in-the-middle.

To resolve this:

- Fix or work-around the problem with your (corporate) environment
- Use a private/personal machine instead
- Get or make a prebuilt executable, instead of using `npm` to install and build from source code.
