// two functions help to implement getGraphNodes
import { Closed, isClosed } from "../../contracts/ui/node";
import type { AnyLeafType, AnyNodeType, NodeId, RootNodeType } from "../contracts-ui";
import { isLeaf, isParent, Node, nodeIdToText, NodeType, Parent, textToNodeId } from "../contracts-ui";
import * as Id from "../id2";
import { assert, compareOrdinal, getOrThrow } from "../utils";
import { NodeStates } from "./nodeStates";
import { Forest, Item, Leafs, Numeric, Top } from "./types";

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

const toNode = (
  item: Item<Numeric>,
  type: AnyNodeType,
  nodeStates: NodeStates,
  parent: Parent | null,
  leafType: AnyLeafType
): Node => {
  const pair = { nodeId: toNodeId(item.id), type };
  const shown = nodeStates.isVisibleNode(pair);
  const isExpanded = nodeStates.isExpandedNode(pair);
  const partial = { ...pair, label: item.name, parent, shown };
  if (type == leafType) {
    assert(!isExpanded);
    return { ...partial, collapsible: "none" };
  }
  if (!isExpanded) {
    return { ...partial, collapsible: "collapsed" };
  }
  return { ...partial, collapsible: "expanded", children: [] };
};

export const toTrunk = (
  top: Top,
  rootNodeType: RootNodeType,
  nodeStates: NodeStates,
  leafType: AnyLeafType
): Forest => {
  const toTrunkNode = (item: Item<Numeric>, type: AnyNodeType, parent: Parent | null): Node =>
    toNode(item, type, nodeStates, parent, leafType);

  const trunk: Forest = { roots: [], allNodes: [] };

  const findParent = (node: Item<number>): Parent | Closed | null => {
    const callbackfn = (previous: Node | null, current: Node): Node | null => {
      if (!node.name.startsWith(current.label)) return previous;
      if (previous && previous.label.length > current.label.length) return previous;
      return current;
    };
    const result = trunk.allNodes.reduce(callbackfn, null);
    assert(!result || !isLeaf(result));
    return result;
  };

  const findParents = (layer: Item<number>[], type: AnyNodeType): void => {
    // calculate all the parents before inserting the layer
    // so that items don't find parents within their own layer
    const pairs = layer.map((item) => ({ item, parent: findParent(item) }));
    pairs.forEach((pair) => {
      const { item, parent } = pair;

      // if parent closed then don't add this child
      // ditto any descendendants of this child which will find the same closed ancestor
      if (parent && (isClosed(parent) || parent.shown == "hidden")) return;

      const node = toTrunkNode(item, type, parent);
      insert(parent ? parent.children : trunk.roots, node);
      trunk.allNodes.push(node);
    });
  };

  const handleGroups = (groups: Item<number>[]) => {
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
        const nodes = layer.map((item) => toTrunkNode(item, NodeType.Group, null));
        trunk.roots.push(...nodes);
        trunk.allNodes.push(...nodes);
      } else findParents(layer, NodeType.Group);
    }
  };

  handleGroups(top.groupItems);
  findParents(top.rootItems, rootNodeType);

  return trunk;
};

export const toLeafs = (trunk: Forest, leafs: Leafs, nodeStates: NodeStates, leafType: AnyLeafType): void => {
  const toLeafNode = (item: Item<Numeric>, type: AnyNodeType, parent: Parent): Node =>
    toNode(item, type, nodeStates, parent, leafType);

  const mapNodes = new Map<string, Node>(trunk.allNodes.map((node) => [nodeIdToText(node.nodeId), node]));

  const getParent = (id: Id.AnyId): Parent => {
    const parentId = getOrThrow(leafs.parentItems, id);
    const node = getOrThrow(mapNodes, parentId.toString());
    assert(isParent(node));
    return node;
  };

  const addToParents = (items: Item<Id.AnyId>[], type: AnyNodeType) =>
    items.forEach((item) => {
      const parent = getParent(item.id);
      const node = toLeafNode(item, type, parent);
      insert(parent.children, node);
      mapNodes.set(nodeIdToText(node.nodeId), node);
      trunk.allNodes.push(node);
    });

  addToParents(leafs.typeItems, NodeType.Type);
  addToParents(leafs.methodItems, NodeType.Method);
};
