import type { CustomViewOptions, GraphFilter, Leaf, Node, NodeId, Parent, ViewGraph } from "../shared-types";
import { groupByNodeId, nameNodeId } from "../shared-types";
import { convertToImage } from "./convertToImage";
import { CustomNode } from "./customJson";
import { log } from "./log";
import { Edges } from "./shared-types";
import { getOrThrow } from "./shared-types/remove";

export const convertLoadedToCustom = (
  nodes: CustomNode[],
  graphViewOptions: CustomViewOptions,
  graphFilter: GraphFilter
): ViewGraph => {
  log("convertLoadedToView");

  const tags = new Map<string, boolean>(graphViewOptions.tags.map(({ tag, shown }) => [tag, shown]));
  const leafNodeId = (id: string): NodeId => nameNodeId("customLeaf", id);
  const hiddenNodeIds = new Set<string>();
  const leafs = new Map<string, Leaf>();

  // do the Leaf[] first to determine which are hidden
  nodes.forEach((node) => {
    if (node.tags?.some((tag) => !tags.get(tag))) hiddenNodeIds.add(node.id);
    else
      leafs.set(node.id, {
        label: node.label ?? node.id,
        nodeId: leafNodeId(node.id),
        parent: null,
      });
  });

  // next do the Edge[]
  const edges = new Edges();
  nodes.forEach((node) => {
    node.dependencies
      .filter((dependency) => !hiddenNodeIds.has(dependency.id))
      .forEach((dependency) => {
        // create an optional label
        const booleans: string[] = [];
        Object.entries(dependency).forEach(([key, value]) => {
          if (value === true) booleans.push(key);
        });

        const label = dependency.label;

        edges.add(leafNodeId(node.id), leafNodeId(dependency.id), label);
      });
  });

  // next do the group
  const groups: Node[] = [];
  const ids = new Set<string>(nodes.map((node) => node.id));
  const autoLayers = new Set<string>(
    nodes.filter((node) => ids.has(node.layer) && node.layer.includes("\\")).map((node) => node.layer)
  );

  if (autoLayers.size > 0) {
    const parents = new Map<string, Parent>(
      [...autoLayers.keys()].map((id) => [
        id,
        { label: id, nodeId: nameNodeId("group", id), parent: null, children: [] },
      ])
    );
    nodes.forEach((node) => {
      const leaf = getOrThrow(leafs, node.id);
      const parent = parents.get(node.layer) ?? parents.get(node.id);
      if (parent) {
        leaf.parent = parent;
        parent.children.push(leaf);
      } else groups.push(leaf);
    });
    groups.push(...parents.values());
  } else {
    const groupedBy = graphViewOptions.clusterBy.length ? graphViewOptions.clusterBy[0] : undefined;
    if (groupedBy) {
      const parents: { [id: string]: Parent } = {};
      nodes.forEach((node) => {
        let groupName = node[groupedBy];
        const leaf = getOrThrow(leafs, node.id);
        if (!groupName) {
          groups.push(leaf);
          return;
        }
        groupName = "" + groupName;
        let parent: Parent = parents[groupName];
        if (!parent) {
          parent = { label: groupName, nodeId: groupByNodeId(groupedBy, groupName), parent: null, children: [] };
          groups.push(parent);
          parents[groupName] = parent;
        }
        parent.children.push(leaf);
        leaf.parent = parent;
      });
    } else groups.push(...Object.values(leafs));
  }

  groups.sort((x, y) => x.label.localeCompare(y.label));

  const image = convertToImage(groups, edges.values(), graphViewOptions, graphFilter, false, undefined);
  return { groups, image, graphViewOptions, graphFilter };
};
