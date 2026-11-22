import type { DotnetOptions } from "../contracts-config";
import { NodeType, nodeIdToText, type Label } from "../contracts-ui";
import { Id, IdBig } from "../id";
import type { Sql } from "../sqlDotnet";
import { getOrSet, getOrThrow } from "../utils";
import type { AddToParent, Forest, Numeric } from "../viewCommon";
import { toNodeId } from "../viewCommon";
import { clusterNamespaces, clusterTypes } from "./clusterNamespaces";

// the tree, and for each namespace or type hidden inside one of its nodes, the id of the node it is hidden in
export type DotnetForest = {
  forest: Forest;
  hiddenIn: Map<Id.CallFromId, Id.CallFromId>;
  // the children of a collapsed node, keyed by that node's id -- not drawn, but what its node's popup would
  // reveal if it were opened. Only visible collapsed nodes are keyed, and the children are only visible ones
  closedChildren: Map<string, Label[]>;
};

// the contents of a trunk whose leaves are methods: the namespaces of the expanded assemblies, their types, and the
// methods of the expanded types. A namespace or type which is clustered is not a node of its own, and its calls are
// the calls of the node it is hidden in.
export const toMethodForest = (
  addToParent: AddToParent<Numeric>,
  trunk: Forest,
  isExpandedId: (id: Id.AnyBigId) => boolean,
  isVisibleId: (id: Id.AnyBigId, parentIsVisible: boolean) => boolean,
  sqlTables: Sql.Tables,
  options: DotnetOptions,
  assemblies: Sql.Assembly[]
): DotnetForest => {
  const closedChildren = new Map<string, Label[]>();
  const addClosedChild = (key: string, label: Label): void => {
    getOrSet(closedChildren, key, () => []).push(label);
  };

  // the isExpandedId filter is applied in code rather than in SQL, so that all the children of a collapsed node
  // -- the namespaces of a collapsed assembly, the types of a collapsed namespace, the methods of a collapsed
  // type -- are selected all the same, and set aside for that node's popup
  const assemblyIds = assemblies.map((assembly) => assembly.id);
  const isExpandedAssembly = (id: Id.AssemblyId): boolean => isExpandedId(IdBig.toBigAssemblyId(id));

  // namespaces -- when they are clustered, the ones which are hidden inside another are not nodes. Of an expanded
  // assembly they are nodes; of a collapsed one they are that node's closed children
  const namespaces = sqlTables.namespaces.selectWhereIn("assemblyId", assemblyIds);
  const namespacesByAssembly = new Map<Id.AssemblyId, Sql.Namespace[]>();
  namespaces.forEach((namespace) => getOrSet(namespacesByAssembly, namespace.assemblyId, () => []).push(namespace));

  const hiddenIn = new Map<Id.CallFromId, Id.CallFromId>();
  const addHiddenTo = <TId extends Id.CallFromId>(hiddenIds: Set<TId>, visibleId: TId): void => {
    const node = getOrThrow(trunk.allNodes, nodeIdToText(toNodeId(visibleId)));
    if (node.isVisible) hiddenIds.forEach((hiddenId) => hiddenIn.set(hiddenId, visibleId));
  };

  const namespaceNodes = new Set<Id.NamespaceId>();
  for (const assembly of assemblies) {
    const assemblyKey = nodeIdToText(toNodeId(assembly.id));
    if (!isExpandedAssembly(assembly.id)) {
      // the first layer of a collapsed assembly is what its node's popup would reveal, if the node is visible
      const assemblyNode = trunk.allNodes.get(assemblyKey);
      if (!assemblyNode?.isVisible) continue;
      (namespacesByAssembly.get(assembly.id) ?? [])
        .filter((namespace) => !namespace.declaringNamespaceId && isVisibleId(namespace.id, assemblyNode.isVisible))
        .forEach((namespace) =>
          addClosedChild(assemblyKey, {
            label: namespace.name,
            nodeId: toNodeId(namespace.id),
            type: NodeType.Namespace,
          })
        );
      continue;
    }
    const { visible, hiddenByVisible } = clusterNamespaces(
      namespacesByAssembly.get(assembly.id) ?? [],
      options.clusterNamespaces,
      isExpandedId
    );
    visible.forEach(({ item: namespace, parentId }) =>
      addToParent(trunk, namespace, NodeType.Namespace, parentId.toString())
    );
    hiddenByVisible.forEach(addHiddenTo);
    visible.forEach(({ item: namespace }) => namespaceNodes.add(namespace.id));
  }

  // type names -- a type is a node when its namespace is a node which is expanded, and when nothing declares it;
  // a type which is declared is clustered into the type which declares it, as the namespaces are. Of a collapsed
  // namespace its root types are that node's closed children
  const typeNames = sqlTables.typeNames.selectWhereIn("assemblyId", assemblyIds).filter((typeName) => {
    const namespaceId = typeName.namespaceId;
    return !namespaceId || namespaceNodes.has(namespaceId);
  });
  const nodeTypeNames: Sql.TypeName[] = [];
  typeNames.forEach((typeName) => {
    const namespaceId = typeName.namespaceId;
    if (namespaceId) {
      if (isExpandedId(namespaceId)) {
        nodeTypeNames.push(typeName);
        return;
      }
      // a collapsed namespace: its root types are what its node's popup would reveal
      const namespaceKey = nodeIdToText(toNodeId(namespaceId));
      const namespaceNode = getOrThrow(trunk.allNodes, namespaceKey);
      if (!namespaceNode.isVisible || typeName.declaringTypeId) return;
      if (isVisibleId(typeName.id, namespaceNode.isVisible))
        addClosedChild(namespaceKey, { label: typeName.name, nodeId: toNodeId(typeName.id), type: NodeType.Type });
      return;
    }
    // a type of an assembly itself: a node under an expanded assembly, a closed child of a collapsed one
    const assemblyKey = nodeIdToText(toNodeId(typeName.assemblyId));
    const assemblyNode = trunk.allNodes.get(assemblyKey);
    if (!assemblyNode?.isVisible || typeName.declaringTypeId) return;
    if (isExpandedAssembly(typeName.assemblyId)) nodeTypeNames.push(typeName);
    else if (isVisibleId(typeName.id, assemblyNode.isVisible))
      addClosedChild(assemblyKey, { label: typeName.name, nodeId: toNodeId(typeName.id), type: NodeType.Type });
  });

  const types = clusterTypes(nodeTypeNames, options.clusterTypes, isExpandedId);
  types.visible.forEach(({ item: typeName, parentId }) =>
    addToParent(trunk, typeName, NodeType.Type, parentId.toString())
  );
  types.hiddenByVisible.forEach(addHiddenTo);

  // method names -- the methods of an expanded type are its children on the graph; of a collapsed type they are
  // not drawn, but are still selected, to be that node's closed children
  const typeIds = types.visible.map(({ item: typeName }) => typeName.id);
  const methodNames = sqlTables.methodNames.selectWhereIn("typeId", typeIds);
  methodNames.forEach((methodName) => {
    const parentId = methodName.typeId.toString();
    if (isExpandedId(methodName.typeId)) {
      addToParent(trunk, methodName, NodeType.Method, parentId);
      return;
    }
    // every selected method's type is a node -- the ids are the visible types' -- so a missing one is a fault
    const typeNode = getOrThrow(trunk.allNodes, parentId);
    if (!typeNode.isVisible || !isVisibleId(methodName.id, typeNode.isVisible)) return;
    addClosedChild(parentId, { label: methodName.name, nodeId: toNodeId(methodName.id), type: NodeType.Method });
  });
  return { forest: trunk, hiddenIn, closedChildren };
};
