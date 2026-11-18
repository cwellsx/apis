import { Id } from "../id";
import type { Sql } from "../sqlDotnet";
import { assert, getOrSet } from "../utils";

// a thing which can be clustered into another: its id, the id of the thing which declares it if anything does, and
// the id of the node it belongs to when nothing does
export type Clusterable<TId extends Id.AnyBigId, TParentId, T> = {
  item: T;
  id: TId;
  declaringId: TId | null;
  parentId: TParentId;
};

export type ClusteredItem<TId extends Id.AnyBigId, TParentId, T> = { item: T; parentId: TId | TParentId };

export type ClusteredItems<TId extends Id.AnyBigId, TParentId, T> = {
  // the things which are nodes, each with the node it belongs to, parents before children
  visible: ClusteredItem<TId, TParentId, T>[];
  // for each of those nodes, the ids of the things which are hidden inside it
  hiddenByVisible: Map<TId, Set<TId>>;
};

// Which things are nodes, and which are hidden inside another, when the ones which declare another are clustered:
// Foo.Bar is a node inside Foo, so Foo.Bar.Baz is a node inside Foo.Bar -- and is not a node at all unless Foo.Bar
// is expanded. Something which is not a node, and so cannot be expanded, hides its own children in the same way,
// which is why each node has a subtree hidden inside it rather than just its own children.
//
// The things form a tree of a depth which is not known in advance, which SQL is not good at, so the tree is built
// here, from the declaring thing of each one. This is shared by the namespaces and the types, which nest the same
// way and differ only in what declares what, and in where a thing belongs when nothing declares it.
const clusterItems = <TId extends Id.AnyBigId, TParentId, T>(
  items: Clusterable<TId, TParentId, T>[],
  cluster: boolean,
  isExpandedId: (id: TId) => boolean
): ClusteredItems<TId, TParentId, T> => {
  const visible: ClusteredItem<TId, TParentId, T>[] = [];
  const hiddenByVisible = new Map<TId, Set<TId>>();

  // when they are not clustered every one is a node where it belongs, whatever declares it. This is the other
  // branch of the option: a view which always showed every one of them could be another option, in the same way
  // as the ones which cluster them.
  if (!cluster) {
    items.forEach((item) => visible.push({ item: item.item, parentId: item.parentId }));
    return { visible, hiddenByVisible };
  }

  const childrenOf = new Map<TId, Clusterable<TId, TParentId, T>[]>();
  items.forEach((item) => {
    if (item.declaringId) getOrSet(childrenOf, item.declaringId, () => []).push(item);
  });

  // the children of a thing are nodes when it is expanded, and hidden inside it when it is not. A thing which
  // declares nothing is a node where it belongs, and one which is declared is a node inside the thing which
  // declares it -- which is expanded, because that is what made this one a node.
  const add = (item: Clusterable<TId, TParentId, T>, hiddenIn: Clusterable<TId, TParentId, T> | undefined): void => {
    if (hiddenIn) getOrSet(hiddenByVisible, hiddenIn.id, () => new Set<TId>()).add(item.id);
    else visible.push({ item: item.item, parentId: item.declaringId ?? item.parentId });

    const hiddenInChildren = hiddenIn ?? (isExpandedId(item.id) ? undefined : item);
    (childrenOf.get(item.id) ?? []).forEach((child) => add(child, hiddenInChildren));
  };

  items.filter((item) => !item.declaringId).forEach((root) => add(root, undefined));

  // a declaring thing is always in the same assembly, so the walk from the roots reaches every one: one which is
  // not reached would be dropped from the graph, which would mean the data is at fault
  const hiddenCount = [...hiddenByVisible.values()].reduce((count, ids) => count + ids.size, 0);
  assert(
    visible.length + hiddenCount === items.length,
    `clustered tree: ${items.length} items, ${visible.length} nodes, ${hiddenCount} hidden`
  );

  return { visible, hiddenByVisible };
};

// The namespaces of an assembly, which belong to their assembly when nothing declares them
export const clusterNamespaces = (
  namespaces: Sql.Namespace[],
  cluster: boolean,
  isExpandedId: (id: Id.NamespaceId) => boolean
): ClusteredItems<Id.NamespaceId, Id.AnyRootId, Sql.Namespace> =>
  clusterItems(
    namespaces.map((namespace) => ({
      item: namespace,
      id: namespace.id,
      declaringId: namespace.declaringNamespaceId,
      parentId: namespace.assemblyId,
    })),
    cluster,
    isExpandedId
  );

// The types of an assembly, which belong to their namespace when nothing declares them
export const clusterTypes = (
  typeNames: Sql.TypeName[],
  cluster: boolean,
  isExpandedId: (id: Id.TypeDefId) => boolean
): ClusteredItems<Id.TypeDefId, Id.AnyCoreId, Sql.TypeName> =>
  clusterItems(
    typeNames.map((typeName) => ({
      item: typeName,
      id: typeName.id,
      declaringId: typeName.declaringTypeId,
      parentId: typeName.namespaceId ?? typeName.assemblyId,
    })),
    cluster,
    isExpandedId
  );

// the namespaces of each assembly which declare nothing, which are the first layer of that assembly
const getRootsOf = (namespaces: Sql.Namespace[]): Map<Id.AssemblyId, Sql.Namespace[]> => {
  const rootsOf = new Map<Id.AssemblyId, Sql.Namespace[]>();
  namespaces.forEach((namespace) => {
    if (!namespace.declaringNamespaceId) getOrSet(rootsOf, namespace.assemblyId, () => []).push(namespace);
  });
  return rootsOf;
};

// The namespaces which are the only one in the first layer of their assembly. Expanding the assembly would
// otherwise reveal a single node, and that node reveals nothing itself until it is expanded by hand, so these are
// expanded by default: the assembly reveals what is inside them, and each can still be collapsed.
export const defaultExpandedNamespaces = (namespaces: Sql.Namespace[], cluster: boolean): Set<Id.NamespaceId> => {
  const result = new Set<Id.NamespaceId>();
  if (!cluster) return result;
  getRootsOf(namespaces).forEach((roots) => {
    if (roots.length === 1) result.add(roots[0].id);
  });
  return result;
};
