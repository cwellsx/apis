import type { AnyLeafType, Node, NodeId } from "../contracts-ui";
import { isParent, nodeIdToText, NodeType } from "../contracts-ui";
import * as Id from "../id2";
import { toAnyBigId } from "../id2";
import type { Sql, ViewType } from "../sql2";
import { netFrameworkGroup } from "../sql2";
import { NodeStates, SqlCommon } from "../sqlCommon";
import { assert, getOrThrow } from "../utils";
import type { Forest, RootItem, Top } from "./forest";
import { makeNodes } from "./makeNodes";
import { makeRootDefaults, makeSetNodeState } from "./makeSetNodeState";
import { toNodeId } from "./toNodeId";
import type { Call, GraphNodes, ViewState } from "./types";

export const createViewState = (sqlTables: Sql.Tables, viewType: ViewType, viewId: Id.ViewId): ViewState => {
  const netFrameworkItem: RootItem<number> = {
    item: { id: netFrameworkGroup.id, name: netFrameworkGroup.name },
    type: NodeType.Group,
    isVisible: false,
    isExpanded: false,
  };

  const getSetNodeStates = sqlTables.viewNodeStates(viewId);
  const { getNodeStates, resetNodeStates } = getSetNodeStates;
  const setNodeState = makeSetNodeState(
    getSetNodeStates,
    Id.toAnyBigId,
    NodeType.Group,
    makeRootDefaults(Id.toAnyBigId, [netFrameworkItem])
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

  const getCalls = (forest: Forest): Call[] => {
    const allNodes = [...forest.allNodes.values()];
    const leafIds = allNodes
      .filter((node) => !isParent(node) && node.isVisible)
      .map((node) => toAnyBigId(node.nodeId, node.type));
    const calls = sqlTables.calls.selectWhereIn(["fromId", "toId"], leafIds as Id.CallFromId[]);
    return calls.map((call) => ({ fromId: toNodeId(call.fromId), toId: toNodeId(call.toId) }));
  };

  const getForest = (nodeStates: NodeStates): Forest => {
    const { toTrunk, addToParent, makeRootNode } = makeNodes(nodeStates, leafType, NodeType.Group, Id.toAnyBigId);
    const trunk = toTrunk(top, rootNodeType);

    const netFrameworkNode = makeRootNode(netFrameworkItem, trunk);

    if (isParent(netFrameworkNode)) {
      const trunk2 = toTrunk(top2, rootNodeType, netFrameworkNode);
      trunk2.allNodes.forEach((value, key) => trunk.allNodes.set(key, value));
    }

    switch (leafType) {
      case NodeType.Assembly:
        return trunk;
      case NodeType.Method: {
        // expanded assemblies
        const assemblyIds = assemblies
          .map((item) => item.id)
          .filter((id) => nodeStates.isExpandedId(Id.toBigAssemblyId(id), false));
        // namespaces
        const namespaces = sqlTables.namespaces.selectWhereIn("assemblyId", assemblyIds);
        namespaces.forEach((namespace) =>
          addToParent(trunk, namespace, NodeType.Namespace, namespace.assemblyId.toString())
        );
        // type names
        const typeNames = sqlTables.typeNames
          .selectWhereIn("assemblyId", assemblyIds)
          .filter((typeName) => !typeName.namespaceId || nodeStates.isExpandedId(typeName.namespaceId, false));
        typeNames.forEach((typeName) =>
          addToParent(
            trunk,
            typeName,
            NodeType.Type,
            typeName.namespaceId ? typeName.namespaceId.toString() : typeName.assemblyId.toString()
          )
        );
        // expanded types
        const typeIds = typeNames.map((typeName) => typeName.id).filter((id) => nodeStates.isExpandedId(id, false));
        // method names
        const methodNames = sqlTables.methodNames.selectWhereIn("typeId", typeIds);
        methodNames.forEach((methodName) =>
          addToParent(trunk, methodName, NodeType.Method, methodName.typeId.toString())
        );
        return trunk;
      }
    }
    assert(false);
  };

  const getGraphNodes = (): GraphNodes => {
    const nodeStates = getNodeStates();
    const forest = getForest(nodeStates);

    const calls = getCalls(forest);
    const getNode = (nodeId: NodeId) => getOrThrow(forest.allNodes, nodeIdToText(nodeId));
    const findNode = (predicate: (node: Node) => boolean) => [...forest.allNodes.values()].find(predicate);

    return { roots: forest.roots, calls, leafType, getNode, findNode };
  };

  return { getGraphNodes, setNodeState, resetNodeStates };
};
