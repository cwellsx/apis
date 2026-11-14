import { SqlCommon } from "../sqlCommon";
import { assert } from "../utils";
import { Parent, ParentKind, Tables } from "./schema";

// The direct children of every node, one level down, which is what a popup shows: a namespace's types, a type's
// methods, an assembly's namespaces -- and, when the namespaces are clustered, a namespace's declaring namespace,
// which is the node a clustered namespace is hidden in.
//
// The direct links are read from ancestors rather than worked out again here, so that the two cannot disagree
// about which links are direct. See ParentKind for why the kinds are bits.
export const insertParents = (tables: Tables): void => {
  const direct: Parent[] = tables.ancestors
    .selectWhere({ isParent: SqlCommon.fromBoolean(true) })
    .map((ancestor) => ({ parentId: ancestor.ancestorId, childId: ancestor.descendentId, kind: ParentKind.Direct }));
  assert(direct.length > 0);

  // a namespace which declares nothing has null in that column, which is falsy
  const clustered: Parent[] = tables.namespaces
    .selectAll()
    .filter((namespace) => !!namespace.declaringNamespaceId)
    .map((namespace) => ({
      parentId: namespace.declaringNamespaceId!,
      childId: namespace.id,
      kind: ParentKind.Clustered,
    }));

  tables.parents.insertMany([...direct, ...clustered]);
};
