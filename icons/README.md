The `react-checkbox-tree` component requires icons.

It uses FontAwesome icons by default.
These must be fetched at run-time from the network, or installed as an npm dependency.

Instead of using FontAwesome I use the icons in `.org\*.svg` which I downloaded individually from:

- https://fonts.google.com/icons

In my https://github.com/cwellsx/time/tree/main/src/topbar/icons project I import icons like this directly -- that
project is based on and built using create-react-app (not Electron Forge), which includes the `@svgr/webpack` loader.

Instead of integrating the `@svgr/webpack` loader with Electron Forge,
for this project I use the CLI to convert the `*.svg` files to TypeScript:

- https://react-svgr.com/docs/cli
