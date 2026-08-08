import type { AnyNodeType, GraphViewType, Node, NodeId } from "../contracts-ui";
import { isParent, NodeType, textToNodeId } from "../contracts-ui";
import type * as Id from "../id2";
import { toAnyBigId } from "../id2";
import { Sql } from "../sql2";
import type { Item, Numeric, ViewType } from "./createDatabase";
import { createDatabase } from "./createDatabase";
import type { Forest } from "./forest";
import { addLeafs, cloneForest, getTrunk } from "./forest";
import { NodeState, NodeStates } from "./nodeStates";

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

const toGraphViewType = (viewType: ViewType): GraphViewType => {
  switch (viewType) {
    case "assemblies":
      return "apis";
    case "namespaces":
      return "apis";
    case "references":
      return "references";
  }
};

const toNodeId = <TId extends Numeric>(id: TId): NodeId => {
  const text = id.toString();
  return textToNodeId(text);
};

const toNodesFromItems = <TId extends Numeric>(items: Item<TId>[], type: AnyNodeType): Node[] =>
  items.map((item) => ({ nodeId: toNodeId(item.id), label: item.name, parent: null, type }));

export type Call = { fromId: NodeId; toId: NodeId };
export type GraphNodes = { forest: Forest; calls: Call[]; graphViewType: GraphViewType };

export type ViewState = {
  getGraphNodes: () => GraphNodes;
  setNodeState: (id: NodeId, nodeType: AnyNodeType, nodeState: NodeState) => void;
};

export const createViewState = (sqlTables: Sql.Tables, viewType: ViewType): ViewState => {
  const { rootNodeType, top, getNodeStates, setAnyNodeState, getLeafs } = createDatabase(sqlTables, viewType);

  const getCalls = (forest: Forest, nodeStates: NodeStates): Call[] => {
    const leafIds = forest.allNodes
      .filter((node) => !isParent(node))
      .map((node) => toAnyBigId(node.nodeId, node.type, viewType))
      .filter((nodeId) => nodeStates.isVisible(nodeId));
    const calls = sqlTables.calls.selectWhereIn(["fromId", "toId"], leafIds as Id.CallFromId[]);
    return calls.map((call) => ({ fromId: toNodeId(call.fromId), toId: toNodeId(call.toId) }));
  };

  const trunk: Forest = getTrunk({
    groups: toNodesFromItems<number>(top.groups, NodeType.Group),
    roots: toNodesFromItems<number>(top.roots, rootNodeType),
  });

  const setNodeState = (id: NodeId, nodeType: AnyNodeType, nodeState: NodeState): void =>
    setAnyNodeState(toAnyBigId(id, nodeType, viewType), nodeState);

  const getGraphNodes = (): GraphNodes => {
    const nodeStates = getNodeStates();
    const forest = cloneForest(trunk, nodeStates, viewType);
    const leafs = getLeafs(nodeStates);
    addLeafs(forest, {
      typeNames: toNodesFromItems<bigint>(leafs.typeNames, NodeType.Type),
      methodNames: toNodesFromItems<bigint>(leafs.methodNames, NodeType.Method),
      parents: new Map<string, string>(
        [...leafs.parents.entries()].map(([key, value]) => [key.toString(), value.toString()])
      ),
    });

    const calls = getCalls(forest, nodeStates);

    return { forest, calls, graphViewType: toGraphViewType(viewType) };
  };

  return { getGraphNodes, setNodeState };
};
