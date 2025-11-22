import { setPaths } from "backend-api";
import type { Paths } from "backend-app";
import { dirAppData, fileCoreExe, fileNativeSqlite } from "./paths";

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
const paths: Paths = { appDataPath: dirAppData, coreExePath: fileCoreExe, sqlNodePath: fileNativeSqlite };
console.log("🔧 Global setup before any test runs");
setPaths(paths);
