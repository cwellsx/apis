import type { AnyLeafType, AnyNodeType, Node, NodeId } from "../contracts-ui";
import { isParent, isVisible, nodeIdToText, NodeType, textToNodeId } from "../contracts-ui";
import type * as Id from "../id2";
import { toAnyBigId } from "../id2";
import { Sql, ViewType } from "../sql2";
import { assert, getOrThrow } from "../utils";
import { createDatabase } from "./createDatabase";
import { NodeStates } from "./createNodeStates";
import type { Forest, Numeric } from "./forest";
import type { NodeState } from "./nodeState";
import { toLeafs, toTrunk } from "./toNodes";

/*
To work with the existing front end we need to call this method

```
export function convertToImage(
  roots: Node[],
  edges: Edges,
  viewOptions: GraphViewOptions,
  graphFilter: GraphFilter,
  shortLeafNames: boolean,
  imageAttributes?: NodeIdMap<ImageAttribute>
): ImageData
```

And use the ImageData with GraphViewData

```
export type ViewGraphData = {
  // could send null if previously-sent Groups has not changed
  // but that would require useState and useEffect in the render
  // https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state
  groups: Node[];

  graphFilter: GraphFilter;
  graphViewOptions: GraphViewOptions;
};
```

- 
*/

const toNodeId = <TId extends Numeric>(id: TId): NodeId => {
  const text = id.toString();
  return textToNodeId(text);
};

export type Call = { fromId: NodeId; toId: NodeId };
export type GraphNodes = {
  roots: Node[];
  calls: Call[];
  leafType: AnyLeafType;
  getNode: (nodeId: NodeId) => Node;
  findNode: (predicate: (node: Node) => boolean) => Node | undefined;
};

export type ViewState = {
  getGraphNodes: () => GraphNodes;
  setNodeState: (id: NodeId, nodeType: AnyNodeType, nodeState: NodeState) => void;
  resetNodeStates: () => void;
  viewType: ViewType;
};

export const createViewState = (sqlTables: Sql.Tables, viewType: ViewType): ViewState => {
  const { rootNodeType, leafType, top, getNodeStates, setAnyNodeState, resetNodeStates, getLeafs } = createDatabase(
    sqlTables,
    viewType
  );

  const getCalls = (forest: Forest): Call[] => {
    const allNodes = [...forest.allNodes.values()];
    const leafIds = allNodes
      .filter((node) => !isParent(node) && isVisible(node))
      .map((node) => toAnyBigId(node.nodeId, node.type, viewType));
    const calls = sqlTables.calls.selectWhereIn(["fromId", "toId"], leafIds as Id.CallFromId[]);
    return calls.map((call) => ({ fromId: toNodeId(call.fromId), toId: toNodeId(call.toId) }));
  };

  const setNodeState = (id: NodeId, nodeType: AnyNodeType, nodeState: NodeState): void =>
    setAnyNodeState(toAnyBigId(id, nodeType, viewType), nodeState);

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

  return { getGraphNodes, setNodeState, viewType, resetNodeStates };
};
