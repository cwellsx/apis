import * as Id from "sut/id2";
import { Tables } from "sut/sql2/schema";
import { assert } from "sut/utils";

type CallsTo = { assemblies: string[]; namespaces: string[]; types: string[]; methods: string[] };
type MappedKeys = Map<string, MappedKeys | CallsTo>;
const newMappedKeys = () => new Map<string, MappedKeys | CallsTo>();
const newCallsTo = () => ({ assemblies: [], namespaces: [], types: [], methods: [] });
const isMap = (value: unknown): value is MappedKeys => value instanceof Map;
const isCallsTo = (value: unknown): value is CallsTo =>
  typeof value === "object" && Array.isArray((value as CallsTo).assemblies);

const splitFullname = (value: string) => {
  const space = value.split(" ");
  assert(space.length == 2);
  const colon = space[1].split("::");
  const returns = space[0] == "System.Void" ? "" : ` => ${space[0]}`;
  return `${colon[0]}  \r\n  ${colon[1]}${returns}`;
};

const isDistinct = true;

const groupByKeys = <T>(rows: T[], keyFns: Array<(row: T) => string>, idFn: (row: T) => Id.CallToId): MappedKeys => {
  const root = newMappedKeys();
  const distinct = new Set<string>();
  for (const row of rows) {
    if (isDistinct) {
      const fn = keyFns[keyFns.length - 1];
      const value = fn(row);
      if (distinct.has(value)) continue;
      distinct.add(value);
    }
    let level: MappedKeys | CallsTo = root;
    keyFns.forEach((fn, index) => {
      const value = fn(row);
      if (index == keyFns.length - 1) {
        // last one is CallsTo
        assert(isCallsTo(level));
        const id = idFn(row);
        switch (Id.isCallToId(id)) {
          case "A":
            level.assemblies.push(value);
            break;
          case "N":
            level.namespaces.push(value);
            break;
          case "T":
            level.types.push(value);
            break;
          case "M":
            level.methods.push(value);
            break;
        }
      } else {
        // previous ones are maps
        assert(isMap(level));
        let next = level.get(value);

        if (!next) {
          next = index == keyFns.length - 2 ? newCallsTo() : newMappedKeys();
          level.set(value, next);
        }
        level = next;
      }
    });
  }
  return root;
};

const emitMarkdownList = (title: "A" | "N" | "T" | "M", value: string[], out: string[]) => {
  if (!value.length) return;
  out.push(title);
  out.push("");
  value = title == "M" ? value.map(splitFullname).sort() : value.sort();
  for (const item of value) {
    out.push(`- ${item}`);
  }
  out.push("");
};

const emitMarkdownTree = (tree: MappedKeys, level: number, out: string[]): void => {
  for (const key of [...tree.keys()].sort()) {
    out.push(`${"#".repeat(level)} ${key}`);
    out.push("");

    const value = tree.get(key);

    if (isMap(value)) {
      emitMarkdownTree(value, level + 1, out);
    } else {
      assert(isCallsTo(value));
      emitMarkdownList("A", value.assemblies, out);
      emitMarkdownList("N", value.namespaces, out);
      emitMarkdownList("T", value.types, out);
      emitMarkdownList("M", value.methods, out);
    }
  }
};

export const printCallFromMethods = (tables: Tables, assemblyName: string): string[] => {
  type Joined = {
    namespaceName: string | null;
    typeName: string;
    methodName: string;
    called: string;
    toId: Id.CallToId;
  };

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
      toId: "calls.toId",
    });
  // const length = allJoined.length;

  const grouped = groupByKeys(
    allJoined,
    [
      (value) => value.namespaceName ?? "(empty)",
      (value) => value.typeName,
      (value) => value.methodName,
      (value) => value.called,
    ],
    (value) => value.toId
  );

  const result: string[] = [];

  emitMarkdownTree(grouped, 1, result);
  return result;
};

export const printCallFromTypes = (tables: Tables, assemblyName: string): string[] => {
  type Joined = { namespaceName: string | null; typeName: string; called: string; toId: Id.CallToId };

  const allJoined = tables.calls
    .join(tables.typeNames, "id", "fromId")
    .join(tables.namespaces, "id", tables.typeNames, "namespaceId")
    .join(tables.assemblies, "id", tables.typeNames, "assemblyId")
    .join(tables.fullNames, "id", tables.calls, "toId")
    .where("assemblies.name = ?", assemblyName)
    .selectAll<Joined>({
      namespaceName: "namespaces.name",
      typeName: "typeNames.name",
      called: "fullnames.fullName",
      toId: "calls.toId",
    });

  // const length = allJoined.length;

  const grouped = groupByKeys(
    allJoined,
    [(value) => value.namespaceName ?? "(empty)", (value) => value.typeName, (value) => value.called],
    (value) => value.toId
  );

  const result: string[] = [];

  emitMarkdownTree(grouped, 1, result);
  return result;
};

export const printCallFromNamespaces = (tables: Tables, namespaceName: string): string[] => {
  type Joined = { namespaceName: string | null; called: string; toId: Id.CallToId };

  const allJoined = tables.calls
    .join(tables.namespaces, "id", "fromId")
    .join(tables.fullNames, "id", tables.calls, "toId")
    .where("namespaces.name LIKE ?", namespaceName + "%")
    .selectAll<Joined>({ namespaceName: "namespaces.name", called: "fullnames.fullName", toId: "calls.toId" });

  // const length = allJoined.length;

  const grouped = groupByKeys(
    allJoined,
    [(value) => value.namespaceName ?? "(empty)", (value) => value.called],
    (value) => value.toId
  );

  const result: string[] = [];

  emitMarkdownTree(grouped, 1, result);
  return result;
};

export const printCallFromAssemblies = (tables: Tables, assemblyName: string): string[] => {
  type Joined = { assemblyName: string; called: string; toId: Id.CallToId };

  const allJoined = tables.calls
    .join(tables.assemblies, "id", "fromId")
    .join(tables.fullNames, "id", tables.calls, "toId")
    .where("assemblies.name = ?", assemblyName)
    .selectAll<Joined>({ assemblyName: "assemblies.name", called: "fullnames.fullName", toId: "calls.toId" });

  // const length = allJoined.length;

  const grouped = groupByKeys(
    allJoined,
    [(value) => value.assemblyName, (value) => value.called],
    (value) => value.toId
  );

  const result: string[] = [];

  emitMarkdownTree(grouped, 1, result);
  return result;
};

export const listCallSizes = (
  tables: Tables,
  assemblyName: string
): {
  assemblies: string[];
  namespaces: string[];
  types: string[];
  methods: string[];
  setMethods: Set<string>;
  setTypes: Set<string>;
  setNamespaces: Set<string>;
  setAssemblies: Set<string>;
} => {
  const fromMethods = tables.calls
    .join(tables.methodNames, "id", "fromId")
    .join(tables.typeNames, "id", tables.methodNames, "typeId")
    .join(tables.namespaces, "id", tables.typeNames, "namespaceId")
    .join(tables.assemblies, "id", tables.typeNames, "assemblyId")
    .join(tables.fullNames, "id", tables.calls, "toId")
    .where("assemblies.name = ?", assemblyName)
    .selectAll<{
      namespaceName: string | null;
      typeName: string;
      methodName: string;
      called: string;
    }>({ namespaceName: "namespaces.name", typeName: "typeNames.name", methodName: "methodNames.name", called: "fullnames.fullName" });

  const fromTypes = tables.calls
    .join(tables.typeNames, "id", "fromId")
    .join(tables.namespaces, "id", tables.typeNames, "namespaceId")
    .join(tables.assemblies, "id", tables.typeNames, "assemblyId")
    .join(tables.fullNames, "id", tables.calls, "toId")
    .where("assemblies.name = ?", assemblyName)
    .selectAll<{
      namespaceName: string | null;
      typeName: string;
      called: string;
    }>({ namespaceName: "namespaces.name", typeName: "typeNames.name", called: "fullnames.fullName" });

  const fromNamespaces = tables.calls
    .join(tables.namespaces, "id", "fromId")
    .join(tables.fullNames, "id", tables.calls, "toId")
    .where("namespaces.name LIKE ?", assemblyName + "%")
    .selectAll<{ namespaceName: string | null; called: string }>({
      namespaceName: "namespaces.name",
      called: "fullnames.fullName",
    });

  const fromAssemblies = tables.calls
    .join(tables.assemblies, "id", "fromId")
    .join(tables.fullNames, "id", tables.calls, "toId")
    .where("assemblies.name = ?", assemblyName)
    .selectAll<{
      assemblyName: string;
      called: string;
    }>({ assemblyName: "assemblies.name", called: "fullnames.fullName" });

  const format = <T>(rows: T[], keyFns: Array<(row: T) => string>, setDistinct: Set<string>): string[] => {
    const isDistinct = (value: string): boolean => {
      if (setDistinct.has(value)) return false;
      setDistinct.add(value);
      return true;
    };

    const fn = keyFns[keyFns.length - 1];
    const format = (row: T): string => {
      let result = "";
      for (let i = 0; i < keyFns.length - 1; ++i) {
        if (result != "") result += " || ";
        result += keyFns[i](row);
      }
      return `- ${fn(row)}  \r\n  ${result}`;
    };
    return rows
      .filter((row) => isDistinct(fn(row)))
      .sort((x, y) => fn(x).localeCompare(fn(y)))
      .map(format);
  };

  const setMethods = new Set<string>();
  const setTypes = new Set<string>();
  const setNamespaces = new Set<string>();
  const setAssemblies = new Set<string>();

  const result = {
    methods: format(
      fromMethods,
      [
        (value) => value.namespaceName ?? "(empty)",
        (value) => value.typeName,
        (value) => value.methodName,
        (value) => value.called,
      ],
      setMethods
    ),
    types: format(
      fromTypes,
      [(value) => value.namespaceName ?? "(empty)", (value) => value.typeName, (value) => value.called],
      setTypes
    ),
    namespaces: format(
      fromNamespaces,
      [(value) => value.namespaceName ?? "(empty)", (value) => value.called],
      setNamespaces
    ),
    assemblies: format(fromAssemblies, [(value) => value.assemblyName, (value) => value.called], setAssemblies),
    setMethods,
    setTypes,
    setNamespaces,
    setAssemblies,
  };

  return result;
};
