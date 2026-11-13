import type { DotnetOptions } from "../contracts-config";
import type { AnyLeafType, EdgeInfo, EdgeLabels, EdgeNodes, Node, NodeId } from "../contracts-ui";
import { edgeIdToText, isParent, nodeIdToText, NodeType } from "../contracts-ui";
import { Id, IdAny, IdBig } from "../id2";
import type { Sql, ViewType } from "../sql2";
import { netFrameworkGroup } from "../sql2";
import { GetSetNodeStatesT, NodeStates, SqlCommon } from "../sqlCommon";
import type { GraphNodes, ImageData, ViewState } from "../types";
import { nodeIdsToEdgeId } from "../types";
import { assert, compareOrdinal, getOrThrow } from "../utils";
import { clusterNamespaces, defaultExpandedNamespaces } from "./clusterNamespaces";
import type { Forest, RootItem, Top } from "./forest";
import { makeNodes } from "./makeNodes";
import { makeRootDefaults, makeSetNodeState } from "./makeSetNodeState";
import { remapCalls } from "./remapCalls";
import { toNodeId } from "./toNodeId";

// the tree, and for each namespace hidden inside one of its namespace nodes, the id of the node it is hidden in
type DotnetForest = { forest: Forest; hiddenIn: Map<Id.NamespaceId, Id.NamespaceId> };

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

  const getNodeStates = (): NodeStates => {
    const nodeStates = sqlNodeStates.getNodeStates();
    return {
      isVisibleId: nodeStates.isVisibleId,
      isExpandedId: (id, isGroup) => nodeStates.isExpandedId(id, isGroup || isDefaultExpanded(id)),
    };
  };

  const getSetNodeStates: GetSetNodeStatesT<Id.AnyBigId> = {
    ...sqlNodeStates,
    getNodeStates,
    setIsExpanded: (id, isGroup, isExpanded) =>
      sqlNodeStates.setIsExpanded(id, isGroup || isDefaultExpanded(id), isExpanded),
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

  const getForest = (nodeStates: NodeStates): DotnetForest => {
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
        visible.forEach(({ namespace, parentId }) =>
          addToParent(trunk, namespace, NodeType.Namespace, parentId.toString())
        );
        // find namespace which are visible but enclosed by clusterNamespaces because their calls contribute to their parents'
        const hiddenIn = new Map<Id.NamespaceId, Id.NamespaceId>();
        hiddenByVisible.forEach((hiddenIds, visibleId) => {
          const node = getOrThrow(trunk.allNodes, nodeIdToText(toNodeId(visibleId)));
          if (node.isVisible) hiddenIds.forEach((hiddenId) => hiddenIn.set(hiddenId, visibleId));
        });

        // type names -- a type is a node when its namespace is a node which is expanded. A namespace which is hidden
        // inside another is not a node even when its stored state says it is expanded, and has no node to add to.
        const namespaceNodes = new Set(visible.map(({ namespace }) => namespace.id));
        const typeNames = sqlTables.typeNames
          .selectWhereIn("assemblyId", assemblyIds)
          .filter(
            (typeName) =>
              !typeName.namespaceId || (namespaceNodes.has(typeName.namespaceId) && isExpandedId(typeName.namespaceId))
          );
        typeNames.forEach((typeName) =>
          addToParent(
            trunk,
            typeName,
            NodeType.Type,
            typeName.namespaceId ? typeName.namespaceId.toString() : typeName.assemblyId.toString()
          )
        );
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

  const getCalls = (forest: Forest, hiddenIn: Map<Id.NamespaceId, Id.NamespaceId>): Sql.Call[] => {
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
    // one level down from an edge: the method calls which are bundled into it, with their names
    //
    // Not included yet: the calls bundled from a namespace which is clustered into one of the edge's nodes. The
    // ancestors table has no namespace to namespace rows, so searching for the node does not find them -- the
    // namespaces clustered into it would have to be searched for as well.
    type PopupCall = Sql.Call & { fromName: string; toName: string };

    /*
      SELECT calls.fromId, calls.toId, fromFullName.fullName, toFullName.fullName
      FROM calls
      JOIN ancestors AS fromAncestor
        ON calls.fromId = fromAncestor.descendentId
      JOIN ancestors AS toAncestor
        ON calls.toId = toAncestor.descendentId
      JOIN fullNames AS fromFullName
        ON calls.fromId = fromFullName.id
      JOIN fullNames AS toFullName
        ON calls.toId = toFullName.id
      WHERE fromAncestor.ancestorId = ?
        AND toAncestor.ancestorId = ?
        AND fromAncestor.isParent = 1
        AND toAncestor.isParent = 1;
    */
    const descendantCalls: PopupCall[] = sqlTables.calls
      .join(sqlTables.ancestors, "descendentId", "fromId", { rightAlias: "fromAncestor" })
      .join(sqlTables.ancestors, "descendentId", sqlTables.calls, "toId", { rightAlias: "toAncestor" })
      .join(sqlTables.fullNames, "id", sqlTables.calls, "fromId", { rightAlias: "fromFullName" })
      .join(sqlTables.fullNames, "id", sqlTables.calls, "toId", { rightAlias: "toFullName" })
      .where("fromAncestor.ancestorId = ?", call.fromId)
      .where("toAncestor.ancestorId = ?", call.toId)
      .where("fromAncestor.isParent = 1")
      .where("toAncestor.isParent = 1")
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
        client: { label: popupCall.fromName, nodeId: toNodeId(popupCall.fromId) },
        server: { label: popupCall.toName, nodeId: toNodeId(popupCall.toId) },
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
