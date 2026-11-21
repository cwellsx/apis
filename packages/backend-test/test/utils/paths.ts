import path from "path";
import { pathExists, pathMkdir } from "./file";

// the generated output lives in this package, so it resolves from this file rather than the working directory
const dirRoot = path.resolve(path.join(__dirname, "..", ".."));

pathMkdir(dirRoot);
const dirTestRoot = path.join(dirRoot, "generated.dotnet");
pathMkdir(dirTestRoot);

export const dirTestCustomRoot = path.join(dirRoot, "generated.custom");
export const dirSnapshots = path.join(dirRoot, "snapshots");
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

export const dirDbJsonl = path.join(dirTestRoot, "db.jsonl");
pathMkdir(dirDbJsonl);
export const fileDbJsonl = (tableName: string) => path.join(dirDbJsonl, tableName + ".jsonl");

// test-dotnet-load output

export const dirLoaded = path.join(dirTestRoot, "loaded");
pathMkdir(dirLoaded);
export const fileLoaded = (filename: string) => path.join(dirLoaded, filename);

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

export const dirDotnet = path.resolve("./externals/dotnet");
export const fileCoreExe = path.join(dirDotnet, "core.exe");

// custom/*

export const dirCustom = path.resolve("./custom");

// examples which the tests copy into the repository, so that what the renderer is given is versioned

export const dirExample = path.join(__dirname, "..", "..", "..", "..", "docs", "ui");
export const fileExample = (filename: string) => path.join(dirExample, filename);
