import type { AreaClass, GraphViewOptions, Image, Leaf, Node, Parent } from "../shared-types";
import { isParent } from "../shared-types";
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
  imageAttributes?: ImageAttributes
): Image | string {
  const { leafVisible, groupExpanded } = viewOptions;
  const isLeafVisible = createLookup(leafVisible);
  const isGroupExpanded = createLookup(groupExpanded);

  // assert the id are unique -- if they're not then CheckboxTree will throw an exception in the renderer
  // also assert that the parent fields are set correctly
  const unique = new Set<string>();
  // also take this opportunity to initialize
  const classNames: { [id: string]: AreaClass } = {};

  const assertUnique = (node: Node): void => {
    const id = node.id;
    if (unique.has(id)) {
      throw new Error(`Duplicate node id: ${id}`);
    }
    unique.add(id);
    let className: AreaClass;
    if (isParent(node)) {
      className = viewOptions.groupExpanded.includes(node.id) ? "expanded" : "closed";
      node.children.forEach((child) => {
        assertUnique(child);
        if (child.parent !== node) {
          throw new Error(`Unexpected parent of:  ${id}`);
        }
      });
    } else className = "leaf";
    classNames[node.id] = className;
  };
  nodes.forEach(assertUnique);

  const showGrouped = viewOptions.showGrouped;

  // create a Map to say which leaf nodes are closed by which non-expanded parent nodes
  const closed = new Map<string, string>();
  if (showGrouped) {
    const findClosed = (node: Node, isClosedBy: Parent | null): void => {
      if (isParent(node)) {
        if (!isClosedBy && !isGroupExpanded(node.id)) isClosedBy = node;
        node.children.forEach((child) => findClosed(child, isClosedBy));
      } else if (isClosedBy) closed.set(node.id, isClosedBy.id);
    };
    nodes.forEach((node) => findClosed(node, null));
  } // else none of the leaf nodes are hidden within closed groups

  const makeEdgeId = (clientId: string, serverId: string): string => `${clientId}|${serverId}`;
  const fromEdgeId = (edgeId: string): { clientId: string; serverId: string } => {
    const split = edgeId.split("|");
    return { clientId: split[0], serverId: split[1] };
  };

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
    showGrouped
      ? isParent(node)
        ? node.children.some((child) => isGroupNodeVisible(child))
        : isLeafVisible(node.id)
      : !isParent(node) && isLeafVisible(node.id);

  const metaGroupLabels = [".NET", "3rd-party"];
  const toImageNode = (node: Node): ImageNode => {
    const textNode = { id: node.id, label: node.label };
    // implement this option here to affect the label on the image but not in the tree of groups
    if (
      showGrouped &&
      options.shortLeafNames &&
      node.parent &&
      !metaGroupLabels.includes(node.parent.label) &&
      (!isParent(node) || !isGroupExpanded(node.id))
    ) {
      if (!node.label.startsWith(node.parent.label)) {
        if (viewOptions.viewType == "references") throw new Error("Unexpected parent node name");
        // else this is a sublayer so do nothing
      } else textNode.label = "*" + node.label.substring(node.parent.label.length);
    }
    return !isParent(node)
      ? { type: "node", ...textNode }
      : !isGroupExpanded(node.id)
      ? { type: "group", ...textNode }
      : { type: "subgraph", ...textNode, children: toImageNodes(node.children) };
  };

  const toImageNodes = (nodes: Nodes): ImageNode[] => nodes.filter(isGroupNodeVisible).map(toImageNode);

  const imageData: ImageData = {
    nodes: toImageNodes(nodes),
    edges: edgeIds.map((edgeId) => {
      return { edgeId, ...fromEdgeId(edgeId) };
    }),
    imageAttributes: imageAttributes ?? {},
    classNames,
  };

  log("createImage");
  return imageData.edges.length || imageData.nodes.length ? createImage(imageData) : "Empty graph, no nodes to display";
}
