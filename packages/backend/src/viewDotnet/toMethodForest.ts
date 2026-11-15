import type { DotnetOptions } from "../contracts-config";
import { NodeType, nodeIdToText } from "../contracts-ui";
import { Id, IdBig } from "../id";
import type { Sql } from "../sqlDotNet";
import { getOrThrow } from "../utils";
import type { AddToParent, Forest, Numeric } from "../viewCommon";
import { toNodeId } from "../viewCommon";
import { clusterNamespaces, clusterTypes } from "./clusterNamespaces";

// the tree, and for each namespace or type hidden inside one of its nodes, the id of the node it is hidden in
export type DotnetForest = { forest: Forest; hiddenIn: Map<Id.CallFromId, Id.CallFromId> };

// the contents of a trunk whose leaves are methods: the namespaces of the expanded assemblies, their types, and the
// methods of the expanded types. A namespace or type which is clustered is not a node of its own, and its calls are
// the calls of the node it is hidden in.
export const toMethodForest = (
  addToParent: AddToParent<Numeric>,
  trunk: Forest,
  isExpandedId: (id: Id.AnyBigId) => boolean,
  sqlTables: Sql.Tables,
  options: DotnetOptions,
  assemblies: Sql.Assembly[]
): DotnetForest => {
  // expanded assemblies
  const assemblyIds = assemblies.map((item) => item.id).filter((id) => isExpandedId(IdBig.toBigAssemblyId(id)));

  // namespaces -- when they are clustered, the ones which are hidden inside another are not nodes
  const namespaces = sqlTables.namespaces.selectWhereIn("assemblyId", assemblyIds);
  const { visible, hiddenByVisible } = clusterNamespaces(namespaces, options.clusterNamespaces, isExpandedId);
  visible.forEach(({ item: namespace, parentId }) =>
    addToParent(trunk, namespace, NodeType.Namespace, parentId.toString())
  );
  // a namespace which is hidden inside a node is not a node itself, so its calls are the calls of the node it
  // is hidden in -- an invisible node has no calls in the graph, and neither do the namespaces inside it
  const hiddenIn = new Map<Id.CallFromId, Id.CallFromId>();
  const addHiddenTo = <TId extends Id.CallFromId>(hiddenIds: Set<TId>, visibleId: TId): void => {
    const node = getOrThrow(trunk.allNodes, nodeIdToText(toNodeId(visibleId)));
    if (node.isVisible) hiddenIds.forEach((hiddenId) => hiddenIn.set(hiddenId, visibleId));
  };
  hiddenByVisible.forEach(addHiddenTo);

  // type names -- a type is a node when its namespace is a node which is expanded, and when nothing declares
  // it; a type which is declared is clustered into the type which declares it, as the namespaces are
  const namespaceNodes = new Set(visible.map(({ item: namespace }) => namespace.id));
  const typeNames = sqlTables.typeNames.selectWhereIn("assemblyId", assemblyIds).filter((typeName) => {
    const namespaceId = typeName.namespaceId;
    if (!namespaceId) return true;
    return namespaceNodes.has(namespaceId) && isExpandedId(namespaceId);
  });
  const types = clusterTypes(typeNames, options.clusterTypes, isExpandedId);
  types.visible.forEach(({ item: typeName, parentId }) =>
    addToParent(trunk, typeName, NodeType.Type, parentId.toString())
  );
  types.hiddenByVisible.forEach(addHiddenTo);

  // expanded types
  const typeIds = typeNames.map((typeName) => typeName.id).filter(isExpandedId);

  // method names
  const methodNames = sqlTables.methodNames.selectWhereIn("typeId", typeIds);
  methodNames.forEach((methodName) => addToParent(trunk, methodName, NodeType.Method, methodName.typeId.toString()));
  return { forest: trunk, hiddenIn };
};
