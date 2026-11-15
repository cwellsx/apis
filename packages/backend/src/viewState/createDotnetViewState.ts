import type { DotnetOptions } from "../contracts-config";
import type { AnyLeafType, AnyNodeType, EdgeInfo, EdgeLabels, EdgeNodes, Node, NodeId } from "../contracts-ui";
import { edgeIdToText, isParent, nodeIdToText, NodeType } from "../contracts-ui";
import { Id, IdAny, IdBig, IdTest } from "../id";
import { DotnetNodeStates, GetSetNodeStatesT, SqlCommon } from "../sqlCommon";
import type { Sql, ViewType } from "../sqlDotNet";
import { netFrameworkGroup, ParentKind } from "../sqlDotNet";
import type { GraphNodes, ImageData, ViewState } from "../types";
import { nodeIdsToEdgeId } from "../types";
import { assert, compareOrdinal, getOrThrow } from "../utils";
import { clusterNamespaces, clusterTypes, defaultExpandedNamespaces } from "./clusterNamespaces";
import type { Forest, RootItem, Top } from "./forest";
import { makeNodes } from "./makeNodes";
import { makeRootDefaults, makeSetNodeState } from "./makeSetNodeState";
import { remapCalls } from "./remapCalls";
import { toNodeId } from "./toNodeId";

// the tree, and for each namespace or type hidden inside one of its nodes, the id of the node it is hidden in
type DotnetForest = { forest: Forest; hiddenIn: Map<Id.CallFromId, Id.CallFromId> };

// the kind of thing a call's endpoint is, which is what the popup shows an icon for
const nodeTypeOf = (id: Id.CallToId): AnyNodeType => {
  switch (IdTest.isCallToId(id)) {
    case "A":
      return NodeType.Assembly;
    case "N":
      return NodeType.Namespace;
    case "T":
      return NodeType.Type;
    case "M":
      return NodeType.Method;
  }
};

export const createDotnetViewState = (
  sqlTables: Sql.Tables,
  viewType: ViewType,
  viewId: Id.ViewId,
  options: DotnetOptions
): ViewState => {
  const netFrameworkItem: RootItem<number> = {
    item: { id: netFrameworkGroup.id, name: netFrameworkGroup.name },
    type: NodeType.Group,
    isVisible: false,
    isExpanded: false,
  };

  const sqlNodeStates = sqlTables.viewNodeStates(viewId);
  const { resetNodeStates } = sqlNodeStates;

  // a namespace which is alone in the first layer of its assembly is expanded by default, as a group is, so that
  // the assembly reveals what is inside it rather than a single node which is closed. It is still a namespace: it
  // can be collapsed, and that is stored like any other state, against the same default.
  const defaultExpanded = defaultExpandedNamespaces(sqlTables.namespaces.selectAll(), options.clusterNamespaces);
  const isDefaultExpanded = (id: Id.AnyBigId): boolean => defaultExpanded.has(id as Id.NamespaceId);

  const getNodeStates = (): DotnetNodeStates => {
    const nodeStates = sqlNodeStates.getNodeStates();
    return {
      isVisibleId: nodeStates.isVisibleId,
      isExpandedId: (id, isGroup) => nodeStates.isExpandedId(id, isGroup || isDefaultExpanded(id)),
    };
  };

  // the namespaces and types clustered into a node are its children in the view but not in the ancestors table: the
  // parents table lists them, and the options decide which kinds count. Zero when nothing is clustered
  const clusteredKinds =
    (options.clusterNamespaces ? ParentKind.ClusteredNamespace : 0n) |
    (options.clusterTypes ? ParentKind.ClusteredType : 0n);

  const getSetNodeStates: GetSetNodeStatesT<Id.AnyBigId> = {
    ...sqlNodeStates,
    getNodeStates,
    setIsExpanded: (id, isGroup, isExpanded) =>
      sqlNodeStates.setIsExpanded(id, isGroup || isDefaultExpanded(id), isExpanded),
    setIsVisible: (id, isParentVisible, isVisible) => {
      sqlNodeStates.setIsVisible(id, isParentVisible, isVisible);
      // a node clustered into this one is below it in the view but not in the ancestors table, so the call above
      // does not clear its state: that is done here, and it recurses, since a clustered node can have clustered
      // nodes of its own. Equal values are what clears a state, and each call clears what is below it as well
      const clusteredChildren =
        clusteredKinds === 0n
          ? []
          : sqlTables.parents
              .selectWhere({ parentId: id })
              .filter((parent) => (parent.kind & clusteredKinds) !== 0n)
              .map((parent) => parent.childId);
      clusteredChildren.forEach((childId) => getSetNodeStates.setIsVisible(childId, isVisible, isVisible));
    },
  };

  const setNodeState = makeSetNodeState(
    getSetNodeStates,
    IdAny.toAnyBigId,
    NodeType.Group,
    makeRootDefaults(IdAny.toAnyBigId, [netFrameworkItem])
  );

  const getLeafType = (): AnyLeafType => {
    switch (viewType) {
      case "calls":
        return NodeType.Method;
      case "references":
        return NodeType.Assembly;
    }
  };

  const assemblies = sqlTables.assemblies.selectAll();
  const groups = sqlTables.groups.selectAll();
  const makeTop = (b: SqlCommon.Boolean): Top => ({
    groupItems: groups.filter((group) => group.isMicrosoft == b),
    rootItems: assemblies.filter((assembly) => assembly.isMicrosoft == b),
  });
  const top: Top = makeTop(0);
  const top2: Top = makeTop(1);
  const rootNodeType = NodeType.Assembly;
  const leafType = getLeafType();

  const getForest = (nodeStates: DotnetNodeStates): DotnetForest => {
    const { toTrunk, addToParent, makeRootNode } = makeNodes(nodeStates, leafType, NodeType.Group, IdAny.toAnyBigId);
    const trunk = toTrunk(top, rootNodeType);
    // nodeStates already encapsulates defaultExpandedNamespaces
    const isExpandedId = (id: Id.AnyBigId): boolean => nodeStates.isExpandedId(id, false);

    const netFrameworkNode = makeRootNode(netFrameworkItem, trunk);

    if (isParent(netFrameworkNode)) {
      const trunk2 = toTrunk(top2, rootNodeType, netFrameworkNode);
      trunk2.allNodes.forEach((value, key) => trunk.allNodes.set(key, value));
    }

    switch (leafType) {
      case NodeType.Assembly:
        return { forest: trunk, hiddenIn: new Map() };
      case NodeType.Method: {
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
        methodNames.forEach((methodName) =>
          addToParent(trunk, methodName, NodeType.Method, methodName.typeId.toString())
        );
        return { forest: trunk, hiddenIn };
      }
    }
    assert(false);
  };

  const getCalls = (forest: Forest, hiddenIn: Map<Id.CallFromId, Id.CallFromId>): Sql.Call[] => {
    const allNodes = [...forest.allNodes.values()];
    const leafIds = allNodes
      .filter((node) => !isParent(node) && node.isVisible)
      .map((node) => IdAny.toAnyBigId(node.nodeId, node.type));

    // the calls of the namespaces which are hidden inside a node are selected with the calls of the nodes, and
    // then attributed to the node each one is hidden in
    const ids = [...leafIds, ...hiddenIn.keys()] as Id.CallFromId[];
    const calls = sqlTables.calls.selectWhereIn(["fromId", "toId"], ids);
    return remapCalls(calls, hiddenIn);
  };

  const getEdgeLabels = (call: Sql.Call): EdgeLabels[] => {
    // one level down from an edge: the method calls which are bundled into it, with their names. One level down is
    // the children of the node, which the parents table lists -- and for a namespace which is clustered, that
    // includes the namespaces hidden inside it, so that a popup shows what the node encloses rather than only the
    // types of its own namespace.
    //
    // The kinds are one number: the direct children, and the namespaces and types clustered into the node, which
    // clusteredKinds says. See ParentKind.
    const parentKinds = ParentKind.Direct | clusteredKinds;
    type PopupCall = Sql.Call & { fromName: string; toName: string };

    /*
      SELECT calls.fromId, calls.toId, fromFullName.fullName, toFullName.fullName
      FROM calls
      JOIN parents AS fromParent
        ON calls.fromId = fromParent.childId
      JOIN parents AS toParent
        ON calls.toId = toParent.childId
      JOIN fullNames AS fromFullName
        ON calls.fromId = fromFullName.id
      JOIN fullNames AS toFullName
        ON calls.toId = toFullName.id
      WHERE fromParent.parentId = ?
        AND toParent.parentId = ?
        AND fromParent.kind & ? <> 0
        AND toParent.kind & ? <> 0;
    */
    const descendantCalls: PopupCall[] = sqlTables.calls
      .join(sqlTables.parents, "childId", "fromId", { rightAlias: "fromParent" })
      .join(sqlTables.parents, "childId", sqlTables.calls, "toId", { rightAlias: "toParent" })
      .join(sqlTables.fullNames, "id", sqlTables.calls, "fromId", { rightAlias: "fromFullName" })
      .join(sqlTables.fullNames, "id", sqlTables.calls, "toId", { rightAlias: "toFullName" })
      .where("fromParent.parentId = ?", call.fromId)
      .where("fromParent.kind & ? <> 0", parentKinds)
      .where("toParent.parentId = ?", call.toId)
      .where("toParent.kind & ? <> 0", parentKinds)
      .selectAll<PopupCall>({
        fromId: "calls.fromId",
        toId: "calls.toId",
        fromName: "fromFullName.fullName",
        toName: "toFullName.fullName",
      });

    // sorted by client, which is the first column of the popup, so that the order is part of the model and
    // every front end shows the rows in the same order. Ties are broken on the server, so it is a total order
    // which doesn't depend on the order the rows came out of SQL.
    return descendantCalls
      .map((popupCall) => ({
        client: { label: popupCall.fromName, nodeId: toNodeId(popupCall.fromId), type: nodeTypeOf(popupCall.fromId) },
        server: { label: popupCall.toName, nodeId: toNodeId(popupCall.toId), type: nodeTypeOf(popupCall.toId) },
      }))
      .sort((x, y) => compareOrdinal(x.client.label, y.client.label) || compareOrdinal(x.server.label, y.server.label));
  };

  const getGraphNodes = (): GraphNodes => {
    const nodeStates = getNodeStates();
    const { forest, hiddenIn } = getForest(nodeStates);

    const calls = getCalls(forest, hiddenIn);
    const getNode = (nodeId: NodeId) => getOrThrow(forest.allNodes, nodeIdToText(nodeId));
    const findNode = (predicate: (node: Node) => boolean) => [...forest.allNodes.values()].find(predicate);

    const edgePopups = new Map<string, EdgeInfo>();
    for (const call of calls) {
      const labels = getEdgeLabels(call);
      const nodeIds = { fromId: toNodeId(call.fromId), toId: toNodeId(call.toId) };
      const nodes: EdgeNodes = { client: getNode(nodeIds.fromId), server: getNode(nodeIds.toId) };
      const edgeId = nodeIdsToEdgeId(nodeIds.fromId, nodeIds.toId);
      edgePopups.set(edgeIdToText(edgeId), { nodes, labels });
    }

    const imageData: ImageData = {
      roots: forest.roots,
      edges: calls.map((call) => nodeIdsToEdgeId(toNodeId(call.fromId), toNodeId(call.toId))),
    };

    return { imageData, edgePopups, leafType, getNode, findNode };
  };

  return { getGraphNodes, setNodeState, resetNodeStates };
};
