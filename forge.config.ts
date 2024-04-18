import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { AutoUnpackNativesPlugin } from "@electron-forge/plugin-auto-unpack-natives";
import { WebpackPlugin } from "@electron-forge/plugin-webpack";
import type { ForgeConfig } from "@electron-forge/shared-types";
import { ResourcePlugin } from "electron-forge-resource-plugin";

import { mainConfig } from "./webpack.main.config";
import { rendererConfig } from "./webpack.renderer.config";

const config: ForgeConfig = {
  packagerConfig: {
    extraResource: "./LICENSE",
    asar: true,
  },
  rebuildConfig: {},
  makers: [new MakerSquirrel({}), new MakerZIP({}, ["darwin"]), new MakerRpm({}), new MakerDeb({})],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      devContentSecurityPolicy: `default-src 'self' 'unsafe-inline' data:; script-src 'self' 'unsafe-eval' 'unsafe-inline' data:; img-src local:`,
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: "./src/renderer/index.html",
            js: "./src/renderer/index.ts",
            name: "main_window",
            preload: {
              js: "./src/preload/index.ts",
            },
          },
          {
            html: "./src/renderer2/index.html",
            js: "./src/renderer2/index.ts",
            name: "second_window",
            preload: {
              js: "./src/preload2/index.ts",
            },
          },
        ],
      },
    }),
    new ResourcePlugin({
      env: "CORE_EXE",
      path: "./src.dotnet/Core/bin/Release/net5.0/Core.exe",
      build: {
        command: "dotnet.exe build ./src.dotnet/Core.sln --verbosity normal --configuration Release",
        sources: ["./src.dotnet/", "./src.dotnet/Core"],
      },
      package: {
        dirname: "core",
      },
      verbose: true,
    }),
  ],
};

export default config;
