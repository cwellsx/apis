import { DataSource } from "../contracts-app";
import { CustomElement } from "../contracts-custom";
import type { SqlCustom } from "../sqlCustom";
import { assertCustomJson, openSqlCustom } from "../sqlCustom";
import { assert, log, readJsonT, whenFile } from "../utils";

const onType = async (dataSource: DataSource): Promise<{ when: string; all: CustomElement[] }> => {
  switch (dataSource.type) {
    case "customJson": {
      const when = await whenFile(dataSource.path);
      const all = await readJsonT(dataSource.path, assertCustomJson);
      return { when, all };
    }
    default:
      throw new Error(`Unexpected dataSource.type: {dataSource.type}`);
  }
};

export const createSqlCustom = async (
  dataSource: DataSource,
  dbFilename: string
): Promise<SqlCustom.Tables> => {
  const { when, all } = await onType(dataSource);

  log(`db filename: ${dbFilename}`);

  assert(all.length != 0);

  return openSqlCustom(dbFilename, when, all);
};
