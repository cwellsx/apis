import { existsSync, mkdirSync } from "fs";
import path from "path";

const dataPath = path.join(__dirname, "..", "data");
// create data directory if it doesn't exist
if (!existsSync(dataPath)) mkdirSync(dataPath);

export const pathTempDb = path.join(dataPath, "temp.db");

export const pathNativeSqlite = (() => {
  const betterSqlite3Path = require.resolve("better-sqlite3");
  const nativePath = path.join(betterSqlite3Path, "..", "..", "build", "Release", "better_sqlite3.node");
  if (!existsSync(nativePath)) {
    throw new Error(`Native better_sqlite3 module not found at expected path: ${nativePath}`);
  }
  return nativePath;
})();
