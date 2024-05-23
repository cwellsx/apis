import type { AreaClass, GraphViewOptions, GroupedLabels, Image, Leaf, Node } from "../shared-types";
import { fromEdgeId, isParent, joinLabel, makeEdgeId, nodeIdToText } from "../shared-types";
import type { ImageAttributes, ImageData, Node as ImageNode } from "./createImage";
import { createImage } from "./createImage";
import { log } from "./log";
import type { Edge, StringPredicate } from "./shared-types";
import { options } from "./shared-types";

type Nodes = Node[] | Leaf[];

const createLookup = (array: string[]): StringPredicate => {
  const temp = new Set(array);
  return (id: string) => temp.has(id);
};

export function convertToImage(
  nodes: Node[],
  edges: Edge[],
  viewOptions: GraphViewOptions,
  imageAttributes?: ImageAttributes,
  groupedLabels?: GroupedLabels
): Image | string {
  const { leafVisible, groupExpanded } = viewOptions;
  const isLeafVisible = createLookup(leafVisible);
  const isGroupExpanded = createLookup(groupExpanded);

  // assert the id are unique -- if they're not then CheckboxTree will throw an exception in the renderer
  // also assert that the parent fields are set correctly
  const allNodes: { [id: string]: Node } = {};
  // also take this opportunity to initialize
  const classNames: { [id: string]: AreaClass } = {};

  const assertUnique = (node: Node): void => {
    const id = nodeIdToText(node.nodeId);
    if (allNodes[id]) {
      throw new Error(`Duplicate node id: ${id}`);
    }
    allNodes[id] = node;
    let className: AreaClass;
    if (isParent(node)) {
      className = viewOptions.groupExpanded.includes(id) ? "expanded" : "closed";
      node.children.forEach((child) => {
        assertUnique(child);
        if (child.parent !== node) {
          throw new Error(`Unexpected parent of:  ${id}`);
        }
      });
    } else className = "leaf";
    classNames[id] = className;
  };
  nodes.forEach(assertUnique);

  // create a Map to say which leaf nodes are closed by which non-expanded parent nodes
  const closed = new Map<string, string>();

  const findClosed = (node: Node, isClosedByParentId: string | null): void => {
    const id = nodeIdToText(node.nodeId);
    if (isParent(node)) {
      if (!isClosedByParentId && !isGroupExpanded(id)) isClosedByParentId = id;
      node.children.forEach((child) => findClosed(child, isClosedByParentId));
    } else if (isClosedByParentId) closed.set(id, isClosedByParentId);
  };
  nodes.forEach((node) => findClosed(node, null));

  // create groups of visible edges
  const edgeGroups = new Map<string, Edge[]>();
  edges
    .filter((edge) => isLeafVisible(edge.clientId) && isLeafVisible(edge.serverId))
    .forEach((edge) => {
      const clientId = closed.get(edge.clientId) ?? edge.clientId;
      const serverId = closed.get(edge.serverId) ?? edge.serverId;
      if (options.noSelfEdges && clientId == serverId) return;
      const edgeId = makeEdgeId(clientId, serverId);
      const found = edgeGroups.get(edgeId);
      if (found) found.push(edge);
      else edgeGroups.set(edgeId, [edge]);
    });

  const edgeIds: string[] = [...edgeGroups.keys()];

  // whether a group is visible depends on whether it contains visible leafs
  const isGroupNodeVisible = (node: Node): boolean =>
    isParent(node)
      ? node.children.some((child) => isGroupNodeVisible(child))
      : isLeafVisible(nodeIdToText(node.nodeId));

  const metaGroupLabels = [".NET", "3rd-party"];
  const toImageNode = (node: Node): ImageNode => {
    const id = nodeIdToText(node.nodeId);
    const textNode = { id, label: node.label };
    // implement this option here to affect the label on the image but not in the tree of groups
    if (
      options.shortLeafNames &&
      node.parent &&
      !metaGroupLabels.includes(node.parent.label) &&
      (!isParent(node) || !isGroupExpanded(id))
    ) {
      if (!node.label.startsWith(node.parent.label)) {
        if (viewOptions.viewType == "references") throw new Error("Unexpected parent node name");
        // else this is a sublayer so do nothing
      } else textNode.label = "*" + node.label.substring(node.parent.label.length);
    }
    return !isParent(node)
      ? { type: "node", ...textNode }
      : !isGroupExpanded(id)
      ? { type: "group", ...textNode }
      : { type: "subgraph", ...textNode, children: toImageNodes(node.children) };
  };

  const toImageNodes = (nodes: Nodes): ImageNode[] => nodes.filter(isGroupNodeVisible).map(toImageNode);

  const imageData: ImageData = {
    nodes: toImageNodes(nodes),
    edges: edgeIds.map((edgeId) => {
      const edges = edgeGroups.get(edgeId);
      const labels: string[] = [];
      edges?.forEach((edge) => {
        const isGroupedEdge = edgeId !== makeEdgeId(edge.clientId, edge.serverId);
        // no need to show the serverLabel unless this is a group of edges
        const label = !isGroupedEdge
          ? edge.label
          : !groupedLabels
          ? undefined
          : joinLabel(groupedLabels.serverLabel, allNodes[edge.serverId].label, groupedLabels.edgeLabel, edge.label);
        if (label) labels.push(label);
      });
      return { edgeId, ...fromEdgeId(edgeId), labels };
    }),
    imageAttributes: imageAttributes ?? {},
    classNames,
  };

  log("createImage");
  return imageData.edges.length || imageData.nodes.length ? createImage(imageData) : "Empty graph, no nodes to display";
}
