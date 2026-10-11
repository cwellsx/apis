import type { AnyNodeType, Node, NodeId } from "../contracts-ui";
import { isParent, isShown, nodeIdToText, NodeType, textToNodeId } from "../contracts-ui";
import type * as Id from "../id2";
import { toAnyCustomId, toCustomId } from "../id2";
import { CustomNodeStates, makeCustomNodeStates, Visible } from "../sqlCommon";
import { SqlCustom } from "../sqlCustom";
import { getOrThrow } from "../utils";
import { CustomTop, Forest, Item, Numeric } from "./forest";
import { addOrphan, addToParent, toTrunk } from "./toNodes";
import type { Call, GraphNodes, ViewState } from "./types";

export const createCustomViewState = (sqlTables: SqlCustom.Tables, viewId: Id.ViewId): ViewState => {
  const { getNodeStates, setAnyNodeState, resetNodeStates } = makeCustomNodeStates(sqlTables.nodeStates, viewId);

  const setNodeState = (id: NodeId, nodeType: AnyNodeType, visible: Visible): void =>
    setAnyNodeState(toAnyCustomId(id, nodeType), visible);

  const toNodeId = <TId extends Numeric>(id: TId): NodeId => {
    const text = id.toString();
    return textToNodeId(text);
  };

  const getCalls = (forest: Forest): Call[] => {
    const allNodes = [...forest.allNodes.values()];
    const leafIds = allNodes
      .filter((node) => !isParent(node) && isShown(node))
      .map((node) => toCustomId(node.nodeId, node.type));
    const calls = sqlTables.edges.selectWhereIn(["fromId", "toId"], leafIds);
    return calls.map((call) => ({ fromId: toNodeId(call.fromId), toId: toNodeId(call.toId) }));
  };

  const toItem = (row: SqlCustom.Group): Item<string> => ({ id: row.id, name: row.id });
  const top: CustomTop = {
    groupItems: sqlTables.groups.selectAll().map(toItem),
    rootItems: sqlTables.layers.selectAll().map(toItem),
  };

  const getForest = (nodeStates: CustomNodeStates): Forest => {
    const trunk = toTrunk(top, NodeType.CustomGroup, nodeStates, NodeType.CustomLeaf, NodeType.CustomGroup);
    const isExpanded = (item: SqlCustom.Item): boolean => !item.layer || !nodeStates.isExpandedId(item.layer, false);
    const leafs = sqlTables.items.selectAll().filter(isExpanded);
    leafs.forEach((leaf) => {
      const item = { id: leaf.id, name: leaf.label ?? leaf.id };
      if (!leaf.layer) addOrphan(trunk, item, NodeType.CustomLeaf, nodeStates, NodeType.CustomLeaf);
      else addToParent(trunk, item, NodeType.CustomLeaf, nodeStates, NodeType.CustomLeaf, leaf.layer);
    });
    return trunk;
  };

  const getGraphNodes = (): GraphNodes => {
    const nodeStates = getNodeStates();
    const forest = getForest(nodeStates);

    const calls = getCalls(forest);
    const getNode = (nodeId: NodeId) => getOrThrow(forest.allNodes, nodeIdToText(nodeId));
    const findNode = (predicate: (node: Node) => boolean) => [...forest.allNodes.values()].find(predicate);

    return { roots: forest.roots, calls, leafType: NodeType.CustomLeaf, getNode, findNode };
  };

  return { getGraphNodes, setNodeState, resetNodeStates };
};
