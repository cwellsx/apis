import type { AnyLeafType, AnyNodeType, NodeId } from "../contracts-ui";
import { isParent, NodeType, textToNodeId } from "../contracts-ui";
import type * as Id from "../id2";
import { toAnyBigId } from "../id2";
import { Sql, ViewType } from "../sql2";
import { assert } from "../utils";
import { createDatabase } from "./createDatabase";
import type { NodeState } from "./nodeState";
import type { NodeStates } from "./nodeStates";
import { toLeafs, toTrunk } from "./toNodes";
import type { Forest, Numeric } from "./types";

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
export type GraphNodes = { forest: Forest; calls: Call[]; leafType: AnyLeafType };

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

  const getCalls = (forest: Forest, nodeStates: NodeStates): Call[] => {
    const leafIds = forest.allNodes
      .filter((node) => !isParent(node) && nodeStates.isExpandedNode(node))
      .map((node) => toAnyBigId(node.nodeId, node.type, viewType));
    const calls = sqlTables.calls.selectWhereIn(["fromId", "toId"], leafIds as Id.CallFromId[]);
    return calls.map((call) => ({ fromId: toNodeId(call.fromId), toId: toNodeId(call.toId) }));
  };

  const setNodeState = (id: NodeId, nodeType: AnyNodeType, nodeState: NodeState): void =>
    setAnyNodeState(toAnyBigId(id, nodeType, viewType), nodeState);

  const getGraphNodes = (): GraphNodes => {
    const nodeStates = getNodeStates();
    const trunk = toTrunk(top, rootNodeType, nodeStates, leafType);

    const getForest = (): Forest => {
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

    const forest = getForest();

    const calls = getCalls(forest, nodeStates);

    return { forest, calls, leafType };
  };

  return { getGraphNodes, setNodeState, viewType, resetNodeStates };
};
