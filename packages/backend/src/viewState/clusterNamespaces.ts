import { Id } from "../id2";
import type { Sql } from "../sql2";
import { assert, getOrSet } from "../utils";

// a namespace which is a node, and the id of the node it is added to
export type ClusteredNamespace = { namespace: Sql.Namespace; parentId: Id.AnyRootId };

export type ClusteredNamespaces = {
  // the namespaces which are nodes, each with the node it belongs to, parents before children
  visible: ClusteredNamespace[];
  // for each of those nodes, the ids of the namespaces which are hidden inside it
  hiddenByVisible: Map<Id.NamespaceId, Set<Id.NamespaceId>>;
};

// An id is never zero -- the ids are packed with a non-zero prefix -- so an id which is absent, which is null in the
// column rather than the undefined its type promises, is falsy like an absent anything else.

// the namespaces of each assembly which declare nothing, which are the first layer of that assembly
const getRootsOf = (namespaces: Sql.Namespace[]): Map<Id.AssemblyId, Sql.Namespace[]> => {
  const rootsOf = new Map<Id.AssemblyId, Sql.Namespace[]>();
  namespaces.forEach((namespace) => {
    if (!namespace.declaringNamespaceId) getOrSet(rootsOf, namespace.assemblyId, () => []).push(namespace);
  });
  return rootsOf;
};

// Which namespaces are nodes, and which are hidden inside another, when the namespaces are clustered: Foo.Bar is a
// node inside Foo, so Foo.Bar.Baz is a node inside Foo.Bar -- and is not a node at all unless Foo.Bar is expanded.
// A namespace which is not a node, and so cannot be expanded, hides its own children in the same way, which is why
// each node has a subtree of namespaces hidden inside it rather than just its own children.
//
// The namespaces form a tree of a depth which is not known in advance, which SQL is not good at, so the tree is
// built here, from the declaring namespace of each one.
export const clusterNamespaces = (
  namespaces: Sql.Namespace[],
  cluster: boolean,
  isExpandedId: (id: Id.NamespaceId) => boolean
): ClusteredNamespaces => {
  const visible: ClusteredNamespace[] = [];
  const hiddenByVisible = new Map<Id.NamespaceId, Set<Id.NamespaceId>>();

  // when they are not clustered every namespace is a node in its assembly, whatever declares it. This is the other
  // branch of the option: a view which always showed every namespace in its assembly could be another option, in
  // the same way as clusterNamespaces.
  if (!cluster) {
    namespaces.forEach((namespace) => visible.push({ namespace, parentId: namespace.assemblyId }));
    return { visible, hiddenByVisible };
  }

  const childrenOf = new Map<Id.NamespaceId, Sql.Namespace[]>();
  namespaces.forEach((namespace) => {
    const declaringId = namespace.declaringNamespaceId;
    if (declaringId) getOrSet(childrenOf, declaringId, () => []).push(namespace);
  });

  // the children of a namespace are nodes when it is expanded, and hidden inside it when it is not. A namespace
  // which declares nothing is a node in its assembly, and one which is declared is a node inside the namespace
  // which declares it -- which is expanded, because that is what made this one a node.
  const add = (namespace: Sql.Namespace, hiddenIn: Sql.Namespace | undefined): void => {
    if (hiddenIn) getOrSet(hiddenByVisible, hiddenIn.id, () => new Set<Id.NamespaceId>()).add(namespace.id);
    else visible.push({ namespace, parentId: namespace.declaringNamespaceId ?? namespace.assemblyId });

    const hiddenInChildren = hiddenIn ?? (isExpandedId(namespace.id) ? undefined : namespace);
    (childrenOf.get(namespace.id) ?? []).forEach((child) => add(child, hiddenInChildren));
  };

  getRootsOf(namespaces).forEach((roots) => roots.forEach((root) => add(root, undefined)));

  // a declaring namespace is always in the same assembly, so the walk from the roots reaches every namespace: one
  // which is not reached would be dropped from the graph, which would mean the data is at fault
  const hiddenCount = [...hiddenByVisible.values()].reduce((count, ids) => count + ids.size, 0);
  assert(
    visible.length + hiddenCount === namespaces.length,
    `namespace tree: ${namespaces.length} namespaces, ${visible.length} nodes, ${hiddenCount} hidden`
  );

  return { visible, hiddenByVisible };
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
