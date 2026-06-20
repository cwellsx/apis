import { assert } from "../utils";
import { Tables } from "./schema";

type MappedKeys = Map<string, MappedKeys | string[]>;
const isArray = (value: MappedKeys | string[]): value is string[] => Array.isArray(value);

const splitFullname = (value: string) => {
  const space = value.split(" ");
  assert(space.length == 2);
  const colon = space[1].split("::");
  const returns = space[0] == "System.Void" ? "" : ` => ${space[0]}`;
  return `${colon[0]}  \r\n  ${colon[1]}${returns}`;
};

const groupByKeys = <T>(rows: T[], keyFns: Array<(row: T) => string>): MappedKeys => {
  const root = new Map<string, MappedKeys | string[]>();
  for (const row of rows) {
    let level: MappedKeys | string[] = root;
    keyFns.forEach((fn, index) => {
      const value = fn(row);
      if (index == keyFns.length - 1) {
        // last one is array
        assert(isArray(level));
        level.push(value);
      } else {
        // previous ones are maps
        assert(!isArray(level));
        let next = level.get(value);

        if (!next) {
          next = index == keyFns.length - 2 ? [] : new Map<string, MappedKeys | string[]>();
          level.set(value, next);
        }
        level = next;
      }
    });
  }
  return root;
};

const emitMarkdownTree = (tree: MappedKeys, level: number, out: string[]): void => {
  for (const key of [...tree.keys()].sort()) {
    out.push(`${"#".repeat(level)} ${key}`);
    out.push("");

    const value = tree.get(key);

    if (value instanceof Map) {
      emitMarkdownTree(value, level + 1, out);
    } else if (Array.isArray(value)) {
      for (const item of value.map(splitFullname).sort()) {
        out.push(`- ${item}`);
      }
      out.push("");
    }
  }
};

export const printCallFromMethods = (tables: Tables, assemblyName: string): string[] => {
  type Joined = { namespaceName: string | null; typeName: string; methodName: string; called: string };

  const allJoined = tables.calls
    .join(tables.methodNames, "id", "fromId")
    .join(tables.typeNames, "id", tables.methodNames, "typeId")
    .join(tables.namespaces, "id", tables.typeNames, "namespaceId")
    .join(tables.assemblies, "id", tables.typeNames, "assemblyId")
    .join(tables.fullNames, "id", tables.calls, "toId")
    .where("assemblies.name = ?", assemblyName)
    .selectAll<Joined>({
      namespaceName: "namespaces.name",
      typeName: "typeNames.name",
      methodName: "methodNames.name",
      called: "fullnames.fullName",
    });
  // const length = allJoined.length;

  const grouped = groupByKeys(allJoined, [
    (value) => value.namespaceName ?? "(empty)",
    (value) => value.typeName,
    (value) => value.methodName,
    (value) => value.called,
  ]);

  const result: string[] = [];

  emitMarkdownTree(grouped, 1, result);
  return result;
};

export const printCallFromTypes = (tables: Tables, assemblyName: string): string[] => {
  type Joined = { namespaceName: string | null; typeName: string; called: string };

  const allJoined = tables.calls
    .join(tables.typeNames, "id", "fromId")
    .join(tables.namespaces, "id", tables.typeNames, "namespaceId")
    .join(tables.assemblies, "id", tables.typeNames, "assemblyId")
    .join(tables.fullNames, "id", tables.calls, "toId")
    .where("assemblies.name = ?", assemblyName)
    .selectAll<Joined>({ namespaceName: "namespaces.name", typeName: "typeNames.name", called: "fullnames.fullName" });

  // const length = allJoined.length;

  const grouped = groupByKeys(allJoined, [
    (value) => value.namespaceName ?? "(empty)",
    (value) => value.typeName,
    (value) => value.called,
  ]);

  const result: string[] = [];

  emitMarkdownTree(grouped, 1, result);
  return result;
};
