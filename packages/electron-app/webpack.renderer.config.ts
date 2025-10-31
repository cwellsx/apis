import path from "path";
import { TsconfigPathsPlugin } from "tsconfig-paths-webpack-plugin";
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
    plugins: [new TsconfigPathsPlugin({ configFile: path.resolve(__dirname, "tsconfig.json") })],
  },
};
