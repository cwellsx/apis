import type { GroupNode, Groups, LeafNode, Loaded, ParentNode } from "../shared-types";
import { isParent } from "../shared-types";

/*

This is a depth-first implementation, could if needed change it to be breadth-first.

*/

export const convertLoadedToGroups = (loaded: Loaded): Groups => {
  const assemblies = loaded.assemblies;
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

  const result: Groups = [];
  for (const name of names.filter(once)) {
    let partial = "";
    let nodes = result;

    for (const part of name.split(".")) {
      // increase the length of the partial name
      partial = !partial ? part : `${partial}.${part}`;
      // append the leaf if this is the leaf
      if (partial === name) {
        const newLeaf: LeafNode = { label: name, id: name };
        nodes.push(newLeaf);
      } else {
        // find or create the parent -- if it already exists then it's the last node, because names are sorted
        const newParent: ParentNode = { label: partial, id: `!${partial}`, children: [] };
        if (!nodes.length || nodes[nodes.length - 1].label !== partial) nodes.push(newParent);
        const found = nodes[nodes.length - 1];
        if (isParent(found)) nodes = found.children;
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

  // assert the id are unique -- if they're not then CheckboxTree will throw an exception in the renderer
  const unique = new Set<string>();
  const assertUnique = (node: GroupNode): void => {
    const id = node.id;
    if (unique.has(id)) {
      throw new Error(`Duplicate node id: ${id}`);
    }
    unique.add(id);
    if (isParent(node)) node.children.forEach(assertUnique);
  };

  result.forEach(assertUnique);

  return result;
};
