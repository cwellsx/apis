import { existsSync, mkdirSync } from "fs";
import path from "path";

const tempDataPath = path.resolve(path.join(__dirname, "..", "temp-data"));
mkdirSync(tempDataPath, { recursive: true });

export const pathTempDb = path.join(tempDataPath, "temp.db");

export const pathAppData = path.join(tempDataPath, "appData");
mkdirSync(pathAppData, { recursive: true });

export const pathNativeSqlite = (() => {
  const betterSqlite3Path = require.resolve("better-sqlite3");
  const nativePath = path.join(betterSqlite3Path, "..", "..", "build", "Release", "better_sqlite3.node");
  if (!existsSync(nativePath)) {
    throw new Error(`Native better_sqlite3 module not found at expected path: ${nativePath}`);
  }
  return nativePath;
})();
