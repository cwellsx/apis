import path from "path";
import { pathExists, pathMkdir } from "./file";

// this is fragile -- will break if you move the source file
const dirRoot = path.resolve(path.join(__dirname, "..", "..", "..", "..", "..", "apis.testdata"));

pathMkdir(dirRoot);
const dirTestRoot = path.join(dirRoot, "Core2");
pathMkdir(dirTestRoot);

export const dirTestCustomRoot = path.join(dirRoot, "Custom");
//pathMkdir(dirTestRoot);

// viewState

export const dirAppData = path.join(dirTestRoot, "appData");
pathMkdir(dirAppData);

// viewState

const dirViewState = path.join(dirTestRoot, "viewState");
pathMkdir(dirViewState);
export const fileViewState = (filename: string) => path.join(dirViewState, filename);

// db files

export const fileTempDb = path.join(dirAppData, "temp.db");
export const fileCoreJson = path.join(dirAppData, "core.json");
export const fileCorePrettyJson = path.join(dirAppData, "core.pretty.json");

// sql table contents

export const dirDbRaw = path.join(dirTestRoot, "db.raw");
pathMkdir(dirDbRaw);
export const fileDbRawJsonl = (tableName: string) => path.join(dirDbRaw, tableName + ".jsonl");

export const dirDbData = path.join(dirTestRoot, "db.2.data");
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

export const dirDotNet = path.resolve("./externals/dotnet");
export const fileCoreExe = path.join(dirDotNet, "core.exe");

// custom/*

export const dirCustom = path.resolve("./custom");
