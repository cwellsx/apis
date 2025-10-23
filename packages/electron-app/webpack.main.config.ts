import { rules } from "./webpack.rules";

import path from "path";
import { TsconfigPathsPlugin } from "tsconfig-paths-webpack-plugin";
import type { Configuration } from "webpack";
import { plugins } from "./webpack.plugins";

export const mainConfig: Configuration = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: "./src/index.ts",
  // Put your normal webpack config below here
  module: {
    rules,
  },
  plugins,
  resolve: {
    extensions: [".js", ".ts", ".jsx", ".tsx", ".css", ".json"],
    alias: {
      shared: path.resolve(__dirname, "../backend/src"),
    },
    plugins: [new TsconfigPathsPlugin({ configFile: path.resolve(__dirname, "tsconfig.json") })],
  },
};
