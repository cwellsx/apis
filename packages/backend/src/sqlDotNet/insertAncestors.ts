import { IdBig } from "../id";
import { SqlCommon } from "../sqlCommon";
import { assert } from "../utils";
import { Ancestor, Tables } from "./schema";

const True = SqlCommon.fromBoolean(true);
const False = SqlCommon.fromBoolean(false);

type AncestorIds = Omit<Ancestor, "isParent">;

export const insertAncestors = (tables: Tables): void => {
  // cleaner syntax would be INSERT INTO table SELECT field FROM table alias
  // but instead of adding to the SqlTable API to support that
  // or using raw SQL which would bypass the ORM
  // do SELECT rows into memory and then bulk insert
  // because that is type-safe and still fast enough

  // types <= methods
  const methodTypes: Ancestor[] = tables.methodNames
    .selectAll()
    .map((methodName) => ({ ancestorId: methodName.typeId, descendentId: methodName.id, isParent: True }));
  assert(methodTypes.length > 0);
  tables.ancestors.insertMany(methodTypes);

  // namespaces <= types
  const typeNamespaces: Ancestor[] = tables.typeNames
    .selectAll()
    .filter((typeName) => !!typeName.namespaceId)
    .map((typeName) => ({ ancestorId: typeName.namespaceId!, descendentId: typeName.id, isParent: True }));
  assert(typeNamespaces.length > 0);
  tables.ancestors.insertMany(typeNamespaces);

  // assemblies <= namespaces
  const namespaceAssemblies: Ancestor[] = tables.namespaces
    .selectAll()
    .map((namespace) => ({
      ancestorId: IdBig.toBigAssemblyId(namespace.assemblyId),
      descendentId: namespace.id,
      isParent: True,
    }));
  assert(namespaceAssemblies.length > 0);
  tables.ancestors.insertMany(namespaceAssemblies);

  // namespace <= join via types <= methods
  const namespacesJoined = tables.ancestors
    .join(tables.typeNames, "id", "ancestorId")
    .selectAll<AncestorIds>({ ancestorId: "typeNames.namespaceId", descendentId: "ancestors.descendentId" })
    .filter((ancestor) => !!ancestor.ancestorId)
    .map((ancestorId) => ({ ...ancestorId, isParent: False }));
  assert(namespacesJoined.length > 0);
  tables.ancestors.insertMany(namespacesJoined);

  // assemblies <= types
  const typeAssemblies: Ancestor[] = tables.typeNames
    .selectAll()
    .map((typeName) => ({
      ancestorId: IdBig.toBigAssemblyId(typeName.assemblyId),
      descendentId: typeName.id,
      isParent: SqlCommon.fromBoolean(!typeName.namespaceId),
    }));
  assert(typeAssemblies.length > 0);
  tables.ancestors.insertMany(typeAssemblies);

  // assemblies <= join via tyoes <= methods
  const assembliesJoined = tables.ancestors
    .join(tables.typeNames, "id", "ancestorId")
    .selectAll<AncestorIds>({ ancestorId: "typeNames.assemblyId", descendentId: "ancestors.descendentId" })
    .map((ancestorIds) => ({ ...ancestorIds, isParent: False }));
  assert(assembliesJoined.length > 0);
  tables.ancestors.insertMany(assembliesJoined);

  // groups <= groups
  const groupGroups: Ancestor[] = tables.groups
    .join(tables.groups, "name", "name", { operand: "startsWithNotEquals", leftAlias: "Left", rightAlias: "Right" })
    .selectAll<AncestorIds>({ ancestorId: "Right.id", descendentId: "Left.id" })
    .map((ancestorIds) => ({ ...ancestorIds, isParent: False }));
  assert(groupGroups.length > 0);
  tables.ancestors.insertMany(groupGroups);

  //groups <= assemblies
  const assemblyGroups: Ancestor[] = tables.assemblies
    .join(tables.groups, "name", "name", { operand: "startsWith" })
    .selectAll<AncestorIds>({ ancestorId: "groups.id", descendentId: "assemblies.id" })
    .map((ancestorIds) => ({ ...ancestorIds, isParent: False }));
  assert(assemblyGroups.length > 0);
  tables.ancestors.insertMany(assemblyGroups);

  // groups <= join via assemblies <= types and methods
  const groupsJoined = tables.ancestors
    .join(tables.assemblies, "id", "ancestorId")
    .join(tables.groups, "name", tables.assemblies, "name", { operand: "startsWith" })
    .selectAll<AncestorIds>({ ancestorId: "groups.id", descendentId: "ancestors.descendentId" })
    .map((ancestorIds) => ({ ...ancestorIds, isParent: False }));
  assert(groupsJoined.length > 0);
  tables.ancestors.insertMany(groupsJoined);
};
