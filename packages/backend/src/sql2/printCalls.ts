import { getOrSet, getOrThrow } from "../utils";
import { Tables } from "./schema";

type Joined = { namespaceName: string | null; typeName: string; methodName: string; called: string };

export const printCalls = (tables: Tables, assemblyName: string): string[] => {
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
  const length = allJoined.length;

  type MethodCalls = Map<string, string[]>;
  type TypeMethods = Map<string, MethodCalls>;
  type NamespaceTypes = Map<string, TypeMethods>;

  const all: NamespaceTypes = new Map<string, TypeMethods>();
  allJoined.forEach((joined) => {
    const typeMethods = getOrSet(all, joined.namespaceName ?? "null", () => new Map<string, MethodCalls>());
    const methodCalls = getOrSet(typeMethods, joined.typeName, () => new Map<string, string[]>());
    const calls = getOrSet(methodCalls, joined.methodName, () => []);
    calls.push(joined.called);
  });

  const result: string[] = [];

  const pushEol = () => result.push("");
  const addTitle = (title: string, level: number) => {
    result.push(`${"#".repeat(level)} ${title}`);
    pushEol();
  };
  addTitle(assemblyName, 1);

  [...all.keys()].sort().forEach((namespace) => {
    addTitle(namespace, 2);
    const typeNames = getOrThrow(all, namespace);

    [...typeNames.keys()].sort().forEach((typeName) => {
      addTitle(typeName, 3);
      const methodCalls = getOrThrow(typeNames, typeName);

      [...methodCalls.keys()].sort().forEach((methodName) => {
        result.push(`${methodName}:`);
        pushEol();

        const calls = getOrThrow(methodCalls, methodName);
        calls.sort().forEach((call) => result.push(`- ${call}`));

        pushEol();
      });
    });
  });

  return result;
};
