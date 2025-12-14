import path from "path";
import { pathExists, pathMkdir } from "./file";

// c:/Dev/apis.testdata

const dirRoot = path.resolve(path.join(__dirname, "..", "..", "..", "..", "apis.testdata"));
pathMkdir(dirRoot);
const dirTestRoot = path.join(dirRoot, "Core.2025-12-10");
pathMkdir(dirTestRoot);

export const dirSutBin = path.join(dirTestRoot, "sut.bin");
pathMkdir(dirSutBin);
export const fileSutJson = path.join(dirTestRoot, "Core.json");

export const dirAppData = path.join(dirTestRoot, "appData");
pathMkdir(dirAppData);

// db files

export const fileTempDb = path.join(dirAppData, "temp.db");
export const fileCoreJson = path.join(dirAppData, "core.json");
export const fileCorePrettyJson = path.join(dirAppData, "core.pretty.json");

// sql table contents

export const dirDbRaw = path.join(dirTestRoot, "db.raw");
pathMkdir(dirDbRaw);
export const fileDbRawJsonl = (tableName: string) => path.join(dirDbRaw, tableName + ".jsonl");

export const dirDbData = path.join(dirTestRoot, "db.data");
pathMkdir(dirDbData);
export const fileDbDataJsonl = (tableName: string) => path.join(dirDbData, tableName + ".jsonl");

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

const dirDotNet = path.resolve("./externals/dotnet");
export const fileCoreExe = path.join(dirDotNet, "core.exe");
