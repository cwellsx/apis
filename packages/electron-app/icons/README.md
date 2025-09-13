In my https://github.com/cwellsx/time/tree/main/src/topbar/icons project I import icons like this directly -- that
project is based on and built using create-react-app (not Electron Forge), which includes the `@svgr/webpack` loader.

Instead of integrating the `@svgr/webpack` loader with Electron Forge,
for this project I use the CLI to convert the `*.svg` files to TypeScript:

- https://react-svgr.com/docs/cli
