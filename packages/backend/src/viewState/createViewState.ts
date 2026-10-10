import type { AnyNodeType, Node, NodeId } from "../contracts-ui";
import { isParent, isShown, nodeIdToText, NodeType, textToNodeId } from "../contracts-ui";
import type * as Id from "../id2";
import { toAnyBigId } from "../id2";
import { Sql, ViewType } from "../sql2";
import { makeNodeStates, NodeStates, Visible } from "../sqlCommon";
import { assert, getOrThrow } from "../utils";
import { databaseNodeTree } from "./databaseNodeTree";
import type { Forest, Numeric } from "./forest";
import { toLeafs, toTrunk } from "./toNodes";
import type { Call, GraphNodes, ViewState } from "./types";

export const createViewState = (sqlTables: Sql.Tables, viewType: ViewType, viewId: Id.ViewId): ViewState => {
  // two "make" modules are closures which do database I/O using sqlTables
  const { rootNodeType, leafType, top, getLeafs } = databaseNodeTree(sqlTables, viewType);
  const { getNodeStates, setAnyNodeState, resetNodeStates } = makeNodeStates(sqlTables.nodeStates, viewId);

  const toNodeId = <TId extends Numeric>(id: TId): NodeId => {
    const text = id.toString();
    return textToNodeId(text);
  };

  const getCalls = (forest: Forest): Call[] => {
    const allNodes = [...forest.allNodes.values()];
    const leafIds = allNodes
      .filter((node) => !isParent(node) && isShown(node))
      .map((node) => toAnyBigId(node.nodeId, node.type));
    const calls = sqlTables.calls.selectWhereIn(["fromId", "toId"], leafIds as Id.CallFromId[]);
    return calls.map((call) => ({ fromId: toNodeId(call.fromId), toId: toNodeId(call.toId) }));
  };

  const setNodeState = (id: NodeId, nodeType: AnyNodeType, visible: Visible): void =>
    setAnyNodeState(toAnyBigId(id, nodeType), visible);

  const getForest = (nodeStates: NodeStates): Forest => {
    const trunk = toTrunk(top, rootNodeType, nodeStates, leafType);
    switch (leafType) {
      case NodeType.Assembly:
        return trunk;
      case NodeType.Custom:
        assert(false);
        break;
      case NodeType.Method: {
        const leafs = getLeafs(nodeStates);
        toLeafs(trunk, leafs, nodeStates, leafType);
        return trunk;
      }
    }
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
