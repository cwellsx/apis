import type { Nodes, ParentNode, IAssemblies } from "../shared-types";
import { isLeaf } from "../shared-types";
import { Config } from "./config";
import { logJson } from "./log";

export const readNodes = (assemblies: IAssemblies, config: Config): Nodes => {
  // flatten and sort all names -- these names will become leaf nodes
  const names: string[] = [];
  for (const name in assemblies) {
    names.push(name);
    names.push(...assemblies[name]);
  }
  names.sort();

  // names contains many duplicates
  const done = new Set<string>();
  const once: (name: string) => boolean = (name) => {
    if (done.has(name)) return false;
    done.add(name);
    return true;
  };

  const result: Nodes = [];
  for (const name of names.filter(once)) {
    let partial = "";
    let nodes = result;

    for (const part of name.split(".")) {
      // increase the length of the partial name
      partial = !partial ? part : `${partial}.${part}`;
      // append the leaf if this is the leaf
      if (partial === name) nodes.push({ label: name, isShown: config.isShown(name) });
      else {
        // find or create the parent -- if it already exists then it's the last node, because names are sorted
        const newParent: ParentNode = { label: partial, children: [] };
        if (!nodes.length || nodes[nodes.length - 1].label !== partial) nodes.push(newParent);
        const found = nodes[nodes.length - 1];
        if (!isLeaf(found)) nodes = found.children;
        else {
          // replace the existing leaf node with a parent node e.g. when a leaf name like "A" is followed by "A.B"
          // so that we will then have a parent named "A", and two children, named "A" and "A.B"
          nodes.pop();
          nodes.push(newParent);
          newParent.children.push(found);
          nodes = newParent.children;
        }
      }
    }
  }
  logJson("nodes", result);
  return result;
};
