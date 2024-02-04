import child_process from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import type { GroupNode, Groups, Image, LeafNode, ParentNode } from "../shared-types";
import { isParent } from "../shared-types";
import { convertPathToUrl } from "./convertPathToUrl";
import { convertXmlMapToAreas } from "./convertXmlMapToAreas";
import { getAppFilename } from "./getAppFilename";
import type { StringPredicate } from "./shared-types";
import { Edge } from "./shared-types";
import { showErrorBox } from "./showErrorBox";

type Nodes = Groups | LeafNode[];

/*
  This is implemented using Graphviz; this is the only module which uses (and therefore encapsulates) Graphviz.
*/

const findDotExe = (): string => {
  const graphvizDirs = [`C:\\Program Files (x86)\\Graphviz\\bin`, `C:\\Program Files\\Graphviz\\bin`];
  for (const graphvizDir of graphvizDirs) {
    const dotExe = path.join(graphvizDir, "dot.exe");
    if (fs.existsSync(dotExe)) return dotExe;
  }
  showErrorBox("dot.exe not found", "Install Graphviz before you can use this program");
  throw new Error("graphviz not found");
};

export function createImage(
  nodes: Nodes,
  edges: Edge[],
  isLeafVisible: StringPredicate,
  isGroupExpanded: StringPredicate
): Image {
  // create a Map to say which lead nodes are closed by which non-expanded parent nodes
  const closed = new Map<string, string>();
  const findClosed = (node: GroupNode, isClosedBy: ParentNode | null): void => {
    if (isParent(node)) {
      if (!isClosedBy && !isGroupExpanded(node.id)) isClosedBy = node;
      node.children.forEach((child) => findClosed(child, isClosedBy));
    } else if (isClosedBy) closed.set(node.id, isClosedBy.id);
  };
  nodes.forEach((node) => findClosed(node, null));

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
      const edgeId = makeEdgeId(clientId, serverId);
      const found = edgeGroups.get(edgeId);
      if (found) found.push(edge);
      else edgeGroups.set(edgeId, [edge]);
    });

  // whether a group is visible depends on whether it contains visible leafs
  const isGroupNodeVisible = (node: GroupNode): boolean =>
    isParent(node) ? node.children.some((child) => isGroupNodeVisible(child)) : isLeafVisible(node.id);

  const getDotFormat = (): string[] => {
    const lines: string[] = [];
    lines.push("digraph SRC {");

    // push the tree of nodes -- use subgraphs for exapanded groups
    const pushLayer = (layer: Nodes, level: number): void => {
      const prefix = " ".repeat(2 * (level + 1));
      for (const node of layer) {
        if (!isParent(node)) {
          if (isLeafVisible(node.id)) {
            lines.push(`${prefix}"${node.id}" [shape=folder, id="${node.id}", label="${node.label}" href=foo];`);
          }
        } else if (isGroupNodeVisible(node)) {
          if (!isGroupExpanded(node.id))
            lines.push(`${prefix}"${node.id}" [shape=rect, id="${node.id}", label="${node.label}" href=foo];`);
          else {
            lines.push(`${prefix}subgraph "cluster_${node.id}" {`);
            lines.push(`${prefix}  label="${node.label}"`);
            pushLayer(node.children, level + 1);
            lines.push(`}`);
          }
        }
      }
    };
    pushLayer(nodes, 0);

    // push the map of grouped edges
    edgeGroups.forEach((_edges, edgeId) => {
      const { clientId, serverId } = fromEdgeId(edgeId);
      lines.push(`  "${clientId}" -> "${serverId}" [id="${clientId}|${serverId}", href=foo]`);
    });

    lines.push("}");
    return lines;
  };

  const lines = getDotFormat();

  const dotFilename = getAppFilename("assemblies.dot");
  const pngFilename = getAppFilename("assemblies.png");
  const mapFilename = getAppFilename("assemblies.map");
  fs.writeFileSync(dotFilename, lines.join(os.EOL));

  const dotExe = findDotExe();
  const args = [dotFilename, "-Tpng", `-o${pngFilename}`, "-Tcmapx", `-o${mapFilename}`, `-Nfontname="Segoe UI"`];

  const spawned = child_process.spawnSync(dotExe, args);
  if (spawned.status !== 0) showErrorBox("dot.exe failed", "" + spawned.error);

  const xml = fs.readFileSync(mapFilename, { encoding: "utf8" });

  return { imagePath: convertPathToUrl(pngFilename), areas: convertXmlMapToAreas(xml), now: Date.now() };
}
