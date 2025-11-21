import { setPaths } from "backend-api";
import type { Paths } from "backend-app";
import path from "path";
import { pathAppData } from "./paths";

/*
  electron-mocha does not currently support mochaHooks
  so instead we do the global setup directly here

export const mochaHooks = {
  beforeAll() {
    // Your one-time setup logic here
    const paths: Paths = { appDataPath: pathAppData, coreExePath: path.resolve("../external/core/core.exe") };
    console.log("🔧 Global setup before any test runs");
    setPaths(paths);
  },
};

*/

// Your one-time setup logic here
const paths: Paths = { appDataPath: pathAppData, coreExePath: path.resolve("./externals/dotnet/core.exe") };
console.log("🔧 Global setup before any test runs");
setPaths(paths);
