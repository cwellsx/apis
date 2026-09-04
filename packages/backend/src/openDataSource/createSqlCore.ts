import type { All } from "../../contracts/dotnet2";
import { isAll } from "../../contracts/dotnet2";
import { DataSource } from "../contracts-app";
import * as dotNetApi from "../dotNetApi";
import type { Sql } from "../sql2";
import { openSql } from "../sql2";
import { assert, existsSync, getAppFilename, jsonParse, log, readJsonT, whenFile, writeFileSync } from "../utils";
import { hash } from "./hash";

const getAllFromCoreExe = async (dataSource: DataSource) => {
  const json = await dotNetApi.getJson(dataSource.path);
  return jsonParse<All>(json);
};

const getAllFromCoreJson = async (dataSource: DataSource) => await readJsonT(dataSource.path, isAll);

const getFilename = (dataSource: DataSource, ext: string) =>
  getAppFilename(`${dataSource.type}-${hash(dataSource.path)}.${ext}`);

const onType = async (dataSource: DataSource): Promise<{ when: string; all: All }> => {
  switch (dataSource.type) {
    case "loadedAssemblies": {
      const when = await dotNetApi.getWhen(dataSource.path);
      const filename = getFilename(dataSource, "json");
      let all: All;
      if (!existsSync(filename) || (await whenFile(filename)) < when) {
        all = await getAllFromCoreExe(dataSource);
        writeFileSync(filename, JSON.stringify(all, null, " "));
      } else {
        all = await readJsonT(filename, isAll);
      }
      return { when, all };
    }
    case "coreJson": {
      const when = await whenFile(dataSource.path);
      const all = await getAllFromCoreJson(dataSource);
      return { when, all };
    }
    default:
      throw new Error(`Unexpected dataSource.type: {dataSource.type}`);
  }
};

export const createSqlCore = async (dataSource: DataSource): Promise<Sql.Tables> => {
  const { when, all } = await onType(dataSource);

  const filename = getFilename(dataSource, "db");
  log(`db filename: ${filename}`);

  assert(Object.keys(all.assemblies).length != 0);

  return openSql(filename, when, all);
};
