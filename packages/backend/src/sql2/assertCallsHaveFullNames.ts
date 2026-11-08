import * as Id from "../id2";
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

// ids are packed as (assemblyId << 32) + token, and the token's high byte identifies its table;
// the table ids are those of id2/idTest.ts (metadata tables, plus this project's own boxed ids)

const describeId = (id: bigint): string => {
  const token = Number(id & 0xffffffffn);
  if (Id.isTableId(token, Id.BoxedId.Assembly)) return "assembly";
  if (Id.isTableId(token, Id.BoxedId.Namespace)) return "namespace";
  if (Id.isTableId(token, Id.TableId.TypeDef)) return "typeDef";
  if (Id.isTableId(token, Id.TableId.TypeSpec)) return "typeSpec";
  if (Id.isTableId(token, Id.TableId.MethodDef)) return "methodDef";
  if (Id.isTableId(token, Id.TableId.MethodSpec)) return "methodSpec";
  if (Id.isTableId(token, Id.TableId.GenericParam)) return "genericParam";
  if (Id.isTableId(token, Id.BoxedId.Group)) return "group";
  return `unknown(0x${token.toString(16)})`;
};

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
    const kind = describeId(id);
    const ids = byKind.get(kind);
    if (ids) ids.push(id);
    else byKind.set(kind, [id]);
  });

  log(`calls without fullName: ${missing.length} ids`);
  byKind.forEach((ids, kind) => log(`  ${kind}: ${ids.length} e.g. ${ids.slice(0, 5).join(", ")}`));

  const kinds = [...byKind.keys()].join(", ");
  assert(missing.length === 0, `calls reference ${missing.length} ids which have no fullName: ${kinds}`);
};