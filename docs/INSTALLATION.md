# Installation

- [Source code](#source-code)
- [Build your own executable](#build-your-own-executable)
- [Prebuilt executables](#prebuilt-executables)
- [Local certificate error](#local-certificate-error)

## Source code

Installing the project's source code, to build it locally, should be simple:

```
git clone https://github.com/cwellsx/apis.git
cd apis
npm install
```

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
