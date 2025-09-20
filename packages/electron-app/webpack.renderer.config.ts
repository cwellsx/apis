import { plugins } from "./webpack.plugins";
import { rules } from "./webpack.rules";

import type { Configuration } from "webpack";

rules.push({
  test: /\.css$/,
  use: [{ loader: "style-loader" }, { loader: "css-loader" }],
});

rules.push({
  test: /\.(s(a|c)ss)$/,
  use: [{ loader: "style-loader" }, { loader: "css-loader" }, "sass-loader"],
});

export const rendererConfig: Configuration = {
  mode: "development",
  devtool: "source-map",
  module: {
    rules,
  },
  plugins,
  resolve: {
    extensions: [".js", ".ts", ".jsx", ".tsx", ".css", ".sass", ".scss"],
  },
  output: {
    // force every module to appear under a single, consistent “webpack://electron-app/…” namespace in the .map file
    devtoolModuleFilenameTemplate: (info) => `webpack://electron-app/${info.resourcePath.replace(/\\/g, "/")}`,
  },
};
