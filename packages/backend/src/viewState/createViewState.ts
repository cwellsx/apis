import type { AnyNodeType, Node, NodeId } from "../contracts-ui";
import { NodeType, textToNodeId } from "../contracts-ui";
import { toAnyId } from "../id2";
import { Sql } from "../sql2";
import type { Item, Numeric, ViewType } from "./createDatabase";
import { createDatabase } from "./createDatabase";
import type { Forest } from "./forest";
import { addLeafs, cloneTrunk, getTrunk } from "./forest";
import { NodeState } from "./nodeState";

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

export type ViewState = {
  getForest: () => Forest;
  getNewForest: () => Forest;
  getRootNode: (forest: Forest, name: string) => Node | undefined;
  setNodeState: (id: NodeId, nodeType: AnyNodeType, nodeState: NodeState) => void;
};

const toNodesFromItems = <TId extends Numeric>(items: Item<TId>[], type: AnyNodeType): Node[] =>
  items.map((item) => {
    const text = item.id.toString();
    const nodeId = textToNodeId(text);
    return { nodeId, label: item.name, parent: null, type };
  });

export const createViewState = (sqlTables: Sql.Tables, viewType: ViewType): ViewState => {
  const { rootNodeType, top, getNodeStates, setAnyNodeState, getLeafs } = createDatabase(sqlTables, viewType);

  const trunk: Forest = getTrunk({
    groups: toNodesFromItems<number>(top.groups, NodeType.Group),
    roots: toNodesFromItems<number>(top.roots, rootNodeType),
  });

  const getForest = cloneTrunk(trunk);

  const getNewForest = (): Forest => {
    const trunk = getForest();
    const nodeStates = getNodeStates();
    const leafs = getLeafs(nodeStates);
    addLeafs(trunk, {
      typeNames: toNodesFromItems<bigint>(leafs.typeNames, NodeType.Type),
      methodNames: toNodesFromItems<bigint>(leafs.methodNames, NodeType.Method),
      parents: new Map<string, string>(
        [...leafs.parents.entries()].map(([key, value]) => [key.toString(), value.toString()])
      ),
    });
    return trunk;
  };

  const getRootNode = (forest: Forest, name: string): Node | undefined =>
    forest.allNodes.find((value) => value.type == rootNodeType && value.label == name);

  const setNodeState = (id: NodeId, nodeType: AnyNodeType, nodeState: NodeState): void =>
    setAnyNodeState(toAnyId(id, nodeType, viewType), nodeState);

  return { getForest, getNewForest, getRootNode, setNodeState };
};
