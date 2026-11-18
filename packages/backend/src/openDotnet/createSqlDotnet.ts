import { DataSource } from "../contracts-app";
import type { All } from "../contracts-dotnet";
import { isAll } from "../contracts-dotnet";
import type { Sql } from "../sqlDotnet";
import { openSql } from "../sqlDotnet";
import { assert, existsSync, jsonParse, log, readJsonT, whenFile, writeFileSync } from "../utils";
import * as dotnetApi from "../dotnetFetch";

const getAllFromCoreExe = async (dataSource: DataSource) => {
  const json = await dotnetApi.getJson(dataSource.path);
  return jsonParse<All>(json);
};

const getAllFromCoreJson = async (dataSource: DataSource) => await readJsonT(dataSource.path, isAll);

const onType = async (
  dataSource: DataSource,
  jsonFilename: string
): Promise<{ when: string; all: All }> => {
  switch (dataSource.type) {
    case "loadedAssemblies": {
      const when = await dotnetApi.getWhen(dataSource.path);
      let all: All;
      if (!existsSync(jsonFilename) || (await whenFile(jsonFilename)) < when) {
        all = await getAllFromCoreExe(dataSource);
        writeFileSync(jsonFilename, JSON.stringify(all, null, " "));
      } else {
        all = await readJsonT(jsonFilename, isAll);
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

export const createSqlDotnet = async (
  dataSource: DataSource,
  dbFilename: string,
  jsonFilename: string
): Promise<Sql.Tables> => {
  const { when, all } = await onType(dataSource, jsonFilename);

  log(`db filename: ${dbFilename}`);

  assert(Object.keys(all.assemblies).length != 0);

  return openSql(dbFilename, when, all);
};
