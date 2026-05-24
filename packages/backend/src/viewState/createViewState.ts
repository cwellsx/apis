import type { AnyNodeType, Node, NodeId } from "../contracts-ui";
import { Sql } from "../sql2";
import { createDatabase } from "./createDatabase";
import type { Forest } from "./forest";
import { addLeafs, cloneTrunk, getTrunk } from "./forest";
import { NodeState } from "./nodeState";
import { toAnyId } from "./toAnyId";
import type { ViewType } from "./viewType";

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

export const createViewState = (sqlTables: Sql.Tables, viewType: ViewType): ViewState => {
  const { rootNodeType, top, getNodeStates, setAnyNodeState, getLeafs } = createDatabase(sqlTables, viewType);

  const trunk: Forest = getTrunk(top);
  const getForest = cloneTrunk(trunk);

  const getNewForest = (): Forest => {
    const trunk = getForest();
    const nodeStates = getNodeStates();
    const leafs = getLeafs(nodeStates);
    addLeafs(trunk, leafs);
    return trunk;
  };

  const getRootNode = (forest: Forest, name: string): Node | undefined =>
    forest.allNodes.find((value) => value.type == rootNodeType && value.label == name);

  const setNodeState = (id: NodeId, nodeType: AnyNodeType, nodeState: NodeState): void =>
    setAnyNodeState(toAnyId(id, nodeType, viewType), nodeState);

  return { getForest, getNewForest, getRootNode, setNodeState };
};
