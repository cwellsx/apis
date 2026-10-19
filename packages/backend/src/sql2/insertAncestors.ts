import * as Id from "../id2";
import { assert } from "../utils";
import { Ancestor, Tables } from "./schema";

export const insertAncestors = (tables: Tables): void => {
  // cleaner syntax would be INSERT INTO table SELECT field FROM table alias
  // but instead of adding to the SqlTable API to support that
  // or using raw SQL which would bypass the ORM
  // do SELECT rows into memory and then bulk insert
  // because that is type-safe and still fast enough

  // methods => types
  const types: Ancestor[] = tables.methodNames
    .selectAll()
    .map((methodName) => ({ ancestorId: methodName.typeId, descendentId: methodName.id }));
  assert(types.length > 0);
  tables.ancestors.insertMany(types);

  // types => namespaces
  const namespaces: Ancestor[] = tables.typeNames
    .selectAll()
    .filter((typeName) => !!typeName.namespaceId)
    .map((typeName) => ({ ancestorId: typeName.namespaceId!, descendentId: typeName.id }));
  assert(namespaces.length > 0);
  tables.ancestors.insertMany(namespaces);

  const namespacesJoined = tables.ancestors
    .join(tables.typeNames, "id", "ancestorId")
    .selectAll<Ancestor>({ ancestorId: "typeNames.namespaceId", descendentId: "ancestors.descendentId" })
    .filter((ancestor) => !!ancestor.ancestorId);
  assert(namespacesJoined.length > 0);
  tables.ancestors.insertMany(namespacesJoined);

  // types => assemblies
  const assemblies: Ancestor[] = tables.typeNames
    .selectAll()
    .map((typeName) => ({ ancestorId: Id.toBigAssemblyId(typeName.assemblyId), descendentId: typeName.id }));
  assert(assemblies.length > 0);
  tables.ancestors.insertMany(assemblies);

  const assembliesJoined = tables.ancestors
    .join(tables.typeNames, "id", "ancestorId")
    .selectAll<Ancestor>({ ancestorId: "typeNames.assemblyId", descendentId: "ancestors.descendentId" });
  assert(assembliesJoined.length > 0);
  tables.ancestors.insertMany(assembliesJoined);

  // groups => groups
  const groups2: Ancestor[] = tables.groups
    .join(tables.groups, "name", "name", { operand: "startsWithNotEquals", leftAlias: "Left", rightAlias: "Right" })
    .selectAll<Ancestor>({ ancestorId: "Right.id", descendentId: "Left.id" });
  assert(groups2.length > 0);
  tables.ancestors.insertMany(groups2);

  // assemblies => groups
  const groups: Ancestor[] = tables.assemblies
    .join(tables.groups, "name", "name", { operand: "startsWith" })
    .selectAll<Ancestor>({ ancestorId: "groups.id", descendentId: "assemblies.id" });
  assert(groups.length > 0);
  tables.ancestors.insertMany(groups);

  const groupsJoined = tables.ancestors
    .join(tables.assemblies, "id", "ancestorId")
    .join(tables.groups, "name", tables.assemblies, "name", { operand: "startsWith" })
    .selectAll<Ancestor>({ ancestorId: "groups.id", descendentId: "ancestors.descendentId" });
  assert(groupsJoined.length > 0);
  tables.ancestors.insertMany(groupsJoined);
};
