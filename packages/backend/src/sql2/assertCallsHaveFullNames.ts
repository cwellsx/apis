import { IdTest } from "../id2";
import { assert, log } from "../utils";
import { Tables } from "./schema";

/*
  Every id referenced by a call must have a row in fullNames, because fullNames is where the
  labels come from.

  All of this data is write-once (see insertAll and insertCalls), so it is cheaper and clearer to
  verify it once after the writes than to guard every read.

  The anti-join is a LEFT JOIN against fullNames, kept only where the right side is NULL, so the
  rows which come back are exactly the ids which have no fullName. fromId and toId are checked
  separately because either end of a call can be missing on its own.
*/

const selectWithoutFullName = (tables: Tables, key: "fromId" | "toId"): bigint[] => {
  const rows = tables.calls
    .join(tables.fullNames, "id", key, { optional: true })
    .where("fullNames.id IS NULL")
    .distinct()
    .selectAll<{ id: bigint }>({ id: `calls.${key}` });

  return rows.map((row) => row.id);
};

export const assertCallsHaveFullNames = (tables: Tables): void => {
  const fromIds = selectWithoutFullName(tables, "fromId");
  const toIds = selectWithoutFullName(tables, "toId");
  const missing = [...new Set([...fromIds, ...toIds])];

  const byKind = new Map<string, bigint[]>();
  missing.forEach((id) => {
    const kind = IdTest.describeId(id);
    const ids = byKind.get(kind);
    if (ids) ids.push(id);
    else byKind.set(kind, [id]);
  });

  log(`calls without fullName: ${missing.length} ids`);
  byKind.forEach((ids, kind) => log(`  ${kind}: ${ids.length} e.g. ${ids.slice(0, 5).join(", ")}`));

  const kinds = [...byKind.keys()].join(", ");
  assert(missing.length === 0, `calls reference ${missing.length} ids which have no fullName: ${kinds}`);
};