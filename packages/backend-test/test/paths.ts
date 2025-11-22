import { existsSync, mkdirSync } from "fs";
import path from "path";

// data-temp/*

const dirDataTemp = path.resolve(path.join(__dirname, "..", "data-temp"));
mkdirSync(dirDataTemp, { recursive: true });

export const fileTempDb = path.join(dirDataTemp, "temp.db");

export const fileCoreJson = path.join(dirDataTemp, "core.json");
export const fileCoreTestJson = path.join(dirDataTemp, "core.test.json");

// data-good/*

const dirDataGood = path.resolve(path.join(__dirname, "..", "data-good"));
mkdirSync(dirDataGood, { recursive: true });
export const fileCoreGoodJson = path.join(dirDataGood, "core.good.json");

// data-temp/app-data/*

export const dirAppData = path.join(dirDataTemp, "appData");
mkdirSync(dirAppData, { recursive: true });

// better-sqlite3.node

export const fileNativeSqlite = (() => {
  const betterSqlite3Path = require.resolve("better-sqlite3");
  const nativePath = path.join(betterSqlite3Path, "..", "..", "build", "Release", "better_sqlite3.node");
  if (!existsSync(nativePath)) {
    throw new Error(`Native better_sqlite3 module not found at expected path: ${nativePath}`);
  }
  return nativePath;
})();

// externals/dotnet/*

export const dirDotNet = path.resolve("./externals/dotnet");
export const fileCoreExe = path.join(dirDotNet, "core.exe");
