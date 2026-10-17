import type { Node, NodeId } from "../contracts-ui";
import { isParent, nodeIdToText, NodeType, textToNodeId } from "../contracts-ui";
import * as Id from "../id2";
import { toAnyBigId } from "../id2";
import { Sql, ViewType } from "../sql2";
import { NodeStates } from "../sqlCommon";
import { assert, getOrThrow } from "../utils";
import { databaseNodeTree } from "./databaseNodeTree";
import type { Forest, Numeric } from "./forest";
import { makeNodes } from "./makeNodes";
import { makeSetNodeState } from "./makeSetNodeState";
import type { Call, GraphNodes, ViewState } from "./types";

export const createViewState = (sqlTables: Sql.Tables, viewType: ViewType, viewId: Id.ViewId): ViewState => {
  const getSetNodeStates = sqlTables.viewNodeStates(viewId);
  const { getNodeStates, resetNodeStates } = getSetNodeStates;
  const setNodeState = makeSetNodeState(getSetNodeStates, Id.toAnyBigId, NodeType.Group);

  const { rootNodeType, leafType, top, getLeafs } = databaseNodeTree(sqlTables, viewType);

  const toNodeId = <TId extends Numeric>(id: TId): NodeId => {
    const text = id.toString();
    return textToNodeId(text);
  };

  const getCalls = (forest: Forest): Call[] => {
    const allNodes = [...forest.allNodes.values()];
    const leafIds = allNodes
      .filter((node) => !isParent(node) && node.isVisible)
      .map((node) => toAnyBigId(node.nodeId, node.type));
    const calls = sqlTables.calls.selectWhereIn(["fromId", "toId"], leafIds as Id.CallFromId[]);
    return calls.map((call) => ({ fromId: toNodeId(call.fromId), toId: toNodeId(call.toId) }));
  };

  const getForest = (nodeStates: NodeStates): Forest => {
    const { toLeafs, toTrunk } = makeNodes(nodeStates, leafType, NodeType.Group, Id.toAnyBigId);
    const trunk = toTrunk(top, rootNodeType);
    switch (leafType) {
      case NodeType.Assembly:
        return trunk;
      case NodeType.Method: {
        const leafs = getLeafs(nodeStates);
        toLeafs(trunk, leafs);
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
