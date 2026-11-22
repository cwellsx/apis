import type { DotnetOptions } from "../contracts-config";
import type { AnyLeafType, EdgeInfo, EdgeNodes, Label, Node, NodeCallRow, NodeId, NodePopups } from "../contracts-ui";
import { edgeIdToText, isClosed, isParent, nodeIdToText, NodeType } from "../contracts-ui";
import { Id, IdAny } from "../id";
import { DotnetNodeStates, GetSetNodeStatesT, SqlCommon } from "../sqlCommon";
import type { Sql, ViewType } from "../sqlDotnet";
import { netFrameworkGroup, ParentKind } from "../sqlDotnet";
import type { GraphNodes, ImageData, ViewState } from "../types";
import { nodeIdsToEdgeId } from "../types";
import { assert, compareOrdinal, getOrThrow } from "../utils";
import type { RootItem, Top } from "../viewCommon";
import { makeNodes, makeRootDefaults, makeSetNodeState, toNodeId } from "../viewCommon";
import { defaultExpandedNamespaces } from "./clusterNamespaces";
import { getCalls } from "./getCalls";
import { getEdgeLabels } from "./getEdgeLabels";
import type { DotnetForest } from "./toMethodForest";
import { toMethodForest } from "./toMethodForest";

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

  // the kinds of a popup's parent: the direct children, and the namespaces and types clustered into the node, which
  // clusteredKinds says. See ParentKind
  const parentKinds = ParentKind.Direct | clusteredKinds;

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
        return { forest: trunk, hiddenIn: new Map(), closedChildren: new Map() };
      case NodeType.Method:
        return toMethodForest(addToParent, trunk, isExpandedId, nodeStates.isVisibleId, sqlTables, options, assemblies);
    }
    assert(false);
  };

  const getGraphNodes = (): GraphNodes => {
    const nodeStates = getNodeStates();
    const { forest, hiddenIn, closedChildren } = getForest(nodeStates);

    const nodeCalls = getCalls(sqlTables, forest, hiddenIn);
    const getNode = (nodeId: NodeId) => getOrThrow(forest.allNodes, nodeIdToText(nodeId));
    const findNode = (predicate: (node: Node) => boolean) => [...forest.allNodes.values()].find(predicate);

    const edgePopups = new Map<string, EdgeInfo>();
    for (const call of nodeCalls) {
      const labels = getEdgeLabels(sqlTables, parentKinds, leafType, call);
      const nodes: EdgeNodes = { client: call.fromNode, server: call.toNode };
      const edgeId = nodeIdsToEdgeId(toNodeId(call.fromId), toNodeId(call.toId));
      edgePopups.set(edgeIdToText(edgeId), { nodes, labels });
    }

    // one popup per visible node -- a closed node's children come from the closedChildren the forest built, an
    // open cluster's from its own children, and a leaf has none. The calls are the drawn calls which touch the
    // node; calls to and from open clusters join them once getCalls supplies them
    const compareChildren = (x: Label, y: Label): number =>
      compareOrdinal(x.type, y.type) || compareOrdinal(x.label, y.label);
    const compareCalls = (x: NodeCallRow, y: NodeCallRow): number =>
      compareOrdinal(x.direction, y.direction) || compareOrdinal(x.type, y.type) || compareOrdinal(x.label, y.label);
    const nodePopups: NodePopups = new Map();
    for (const node of forest.allNodes.values()) {
      if (!node.isVisible) continue;
      const key = nodeIdToText(node.nodeId);
      const children: Label[] = isClosed(node)
        ? [...(closedChildren.get(key) ?? [])]
        : isParent(node)
          ? node.children.map((child) => ({ label: child.label, nodeId: child.nodeId, type: child.type }))
          : [];
      const callRows: NodeCallRow[] = [];
      for (const call of nodeCalls) {
        if (call.fromNode.nodeId === node.nodeId)
          callRows.push({
            label: call.toNode.label,
            nodeId: call.toNode.nodeId,
            type: call.toNode.type,
            direction: "right",
          });
        if (call.toNode.nodeId === node.nodeId)
          callRows.push({
            label: call.fromNode.label,
            nodeId: call.fromNode.nodeId,
            type: call.fromNode.type,
            direction: "left",
          });
      }
      nodePopups.set(key, {
        node: { label: node.label, nodeId: node.nodeId, type: node.type },
        children: children.sort(compareChildren),
        calls: callRows.sort(compareCalls),
      });
    }

    const imageData: ImageData = {
      roots: forest.roots,
      edges: nodeCalls.map((call) => nodeIdsToEdgeId(toNodeId(call.fromId), toNodeId(call.toId))),
    };

    return { imageData, edgePopups, nodePopups, leafType, getNode, findNode };
  };

  return { getGraphNodes, setNodeState, resetNodeStates };
};
