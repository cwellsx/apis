import path from "path";
import { pathExists, pathMkdir } from "./file";

// data-temp/*

const dirDataTemp = path.resolve(path.join(__dirname, "..", "data-temp"));
pathMkdir(dirDataTemp);

export const fileTempDb = path.join(dirDataTemp, "temp.db");

export const fileCoreJson = path.join(dirDataTemp, "core.json");
export const fileCoreTempJson = path.join(dirDataTemp, "core.test.json");

// data-good/*

const dirDataGood = path.resolve(path.join(__dirname, "..", "data-good"));
pathMkdir(dirDataGood);
export const fileCoreGoodJson = path.join(dirDataGood, "core.good.json");

// data-temp/app-data/*

export const dirAppData = path.join(dirDataTemp, "appData");
pathMkdir(dirAppData);

// better-sqlite3.node

export const fileNativeSqlite = (() => {
  const betterSqlite3Path = require.resolve("better-sqlite3");
  const betterSqlite3lib = path.resolve(path.dirname(betterSqlite3Path));
  const nativePath = path.join(betterSqlite3lib, "..", "build", "Release", "better_sqlite3.node");
  if (!pathExists(nativePath)) {
    throw new Error(`Native better_sqlite3 module not found at expected path: ${nativePath}`);
  }
  return nativePath;
})();

// externals/dotnet/*

export const dirDotNet = path.resolve("./externals/dotnet");
export const fileCoreExe = path.join(dirDotNet, "core.exe");

// sql

const dirSqlTemp = path.join(dirDataTemp, "sqlTable");
pathMkdir(dirSqlTemp);
const dirSqlGood = path.join(dirDataGood, "sqlTable");
pathMkdir(dirSqlGood);
export const fileSqlTable = (tableName: string) => {
  const fileName = tableName + ".json";
  return { tempFileName: path.join(dirSqlTemp, fileName), goodFileName: path.join(dirSqlGood, fileName) };
};
