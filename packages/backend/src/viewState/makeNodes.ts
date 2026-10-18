// two functions help to implement getGraphNodes
import type { AnyGroupType, AnyLeafType, AnyNodeType, Closed, NodeId, RootNodeType } from "../contracts-ui";
import { isClosed, isLeaf, isParent, Node, nodeIdToText, Parent, textToNodeId } from "../contracts-ui";
import * as Id from "../id2";
import type { NodeStatesT } from "../sqlCommon";
import { assert, compareOrdinal, getOrThrow } from "../utils";
import { Forest, Item, Numeric, TopT } from "./forest";
import { ToT } from "./toT";

const insert = <T extends { label: string }>(array: T[], node: T): void => {
  let lo = 0;
  let hi = array.length;

  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (array[mid].label < node.label) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  array.splice(lo, 0, node);
};

// like toNodeId in ../nodeIds but this accepts Numeric instead of AnyNodeId
const toNodeId = <TId extends Numeric>(id: TId): NodeId => {
  const text = id.toString();
  return textToNodeId(text);
};

const addAllNodes = (forest: Forest, node: Node) => forest.allNodes.set(nodeIdToText(node.nodeId), node);

export type MakeNodes<TId extends Numeric> = {
  toTrunk: (top: TopT<TId>, rootNodeType: RootNodeType) => Forest;
  addToParent: (trunk: Forest, item: Item<TId>, type: AnyNodeType, parentId: string) => void;
  addOrphan: (trunk: Forest, item: Item<TId>, type: AnyNodeType) => void;
};

export const makeNodes = <TId extends Numeric, T extends Id.AnyBigId | Id.AnyCustomId>(
  nodeStates: NodeStatesT<T>,
  leafType: AnyLeafType,
  groupType: AnyGroupType,
  toT: ToT<T> // Id.toAnyBigId or Id.toAnyCustomId
): MakeNodes<TId> => {
  // private toNode
  const toNode = (item: Item<Numeric>, type: AnyNodeType, parent: Parent | null): Node => {
    const pair = { nodeId: toNodeId(item.id), type };
    const id = toT(pair.nodeId, pair.type);
    const isParentVisible = parent ? parent.isVisible : true;
    const isVisible = nodeStates.isVisibleId(id, isParentVisible);
    if (isVisible != isParentVisible)
      for (let ancestor = parent; ancestor != null; ancestor = ancestor?.parent ?? null) ancestor.isMixed = true;
    const isExpanded = nodeStates.isExpandedId(id, pair.type === groupType);
    const partial = { ...pair, label: item.name, parent };
    if (type == leafType) {
      assert(!isExpanded);
      return { ...partial, collapsible: "none", isVisible };
    }
    if (!isExpanded) {
      return { ...partial, isVisible, collapsible: "collapsed" };
    }
    return { ...partial, isVisible, collapsible: "expanded", isMixed: false, children: [] };
  };

  const toTrunk = (top: TopT<TId>, rootNodeType: RootNodeType): Forest => {
    const toTrunkNode = (item: Item<TId>, type: AnyNodeType, parent: Parent | null): Node => toNode(item, type, parent);

    // the root nodes don't identify which group contains them
    // so findParent finds the group by which has the closest name
    const trunk: Forest = { roots: [], allNodes: new Map<string, Node>() };
    const allNodes: Node[] = [];

    const addNode = (node: Node): void => {
      allNodes.push(node);
      addAllNodes(trunk, node);
    };

    const findParent = (node: Item<TId>): Parent | Closed | null => {
      const callbackfn = (previous: Node | null, current: Node): Node | null => {
        if (!node.name.startsWith(current.label)) return previous;
        if (previous && previous.label.length > current.label.length) return previous;
        return current;
      };
      const result = allNodes.reduce(callbackfn, null);
      assert(!result || !isLeaf(result));
      return result;
    };

    const findParents = (layer: Item<TId>[], type: AnyNodeType): void => {
      // calculate all the parents before inserting the layer
      // so that items don't find parents within their own layer
      const pairs = layer.map((item) => ({ item, parent: findParent(item) }));
      pairs.forEach((pair) => {
        const { item, parent } = pair;

        // if parent closed then don't add this child
        // ditto any descendendants of this child which will find the same closed ancestor
        // but show expanded children even if the parent is hidden
        if (parent && isClosed(parent)) return;

        const node = toTrunkNode(item, type, parent);
        insert(parent ? parent.children : trunk.roots, node);
        addNode(node);
      });
    };

    const handleGroups = (groups: Item<TId>[]) => {
      const pairs = groups.map((item) => ({ item, split: item.name.split(".") }));
      const lengths = pairs.map((pair) => pair.split.length);
      const max = Math.max(...lengths);
      const min = Math.min(...lengths);
      // do shorter before longer -- the shortest are roots without parents, the longer may have parent
      for (let level = min; level <= max; ++level) {
        const layer = pairs.filter((pair) => pair.split.length == level).map((pair) => pair.item);
        if (!layer.length) return;
        if (level == min) {
          layer.sort((x, y) => compareOrdinal(x.name, y.name));
          const nodes = layer.map((item) => toTrunkNode(item, groupType, null));
          trunk.roots.push(...nodes);
          nodes.forEach(addNode);
        } else findParents(layer, groupType);
      }
    };

    handleGroups(top.groupItems);
    findParents(top.rootItems, rootNodeType);

    return trunk;
  };

  const addToParent = (trunk: Forest, item: Item<TId>, type: AnyNodeType, parentId: string): void => {
    const parent = getOrThrow(trunk.allNodes, parentId);
    assert(isParent(parent));
    const node = toNode(item, type, parent);
    insert(parent.children, node);
    addAllNodes(trunk, node);
  };

  const addOrphan = (trunk: Forest, item: Item<TId>, type: AnyNodeType): void => {
    const node = toNode(item, type, null);
    addAllNodes(trunk, node);
  };

  return { toTrunk, addToParent, addOrphan };
};
