import type { GroupNode, Groups, LeafNode, ParentNode } from "../shared-types";
import { isParent } from "../shared-types";
import type { Loaded, StringPredicate } from "./shared-types";
import { options, remove, replace } from "./shared-types";
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
  const once: StringPredicate = (name) => {
    if (done.has(name)) return false;
    done.add(name);
    return true;
  };

  const result: Groups = [];
  for (const name of names.filter(once)) {
    let partial = "";
    let nodes = result;

    let parent: ParentNode | null = null;
    for (const part of name.split(".")) {
      // increase the length of the partial name
      partial = !partial ? part : `${partial}.${part}`;
      // append the leaf if this is the leaf
      if (partial === name) {
        const newLeaf: LeafNode = { label: name, id: name, parent };
        nodes.push(newLeaf);
      } else {
        // find or create the parent -- if it already exists then it's the last node, because names are sorted
        const newParent: ParentNode = { label: partial, id: `!${partial}`, children: [], parent };
        if (!nodes.length || nodes[nodes.length - 1].label !== partial) nodes.push(newParent);
        const found = nodes[nodes.length - 1];
        if (isParent(found)) {
          parent = found;
          nodes = found.children;
        } else {
          // replace the existing leaf node with a parent node e.g. when a leaf name like "A" is followed by "A.B"
          // so that we will then have a parent named "A", and two children, named "A" and "A.B"
          nodes.pop();
          nodes.push(newParent);
          parent = newParent;
          newParent.children.push(found);
          found.parent = parent;
          nodes = newParent.children;
        }
      }
    }
  }

  if (options.ungroupSingle) {
    const ungroupSingle = (nodes: Groups): void => {
      nodes.slice().forEach((node) => {
        if (isParent(node)) {
          let children: Groups | undefined = node.children;
          if (node.children.length == 1) {
            const child = node.children[0];
            child.parent = node.parent;
            replace(nodes, node, child);
            children = isParent(child) ? child.children : undefined;
          }
          if (children) ungroupSingle(children);
        }
      });
    };
    ungroupSingle(result);
  }

  const regroup = (predicate: StringPredicate, label: string, id: string): void => {
    const found = result.filter((node) => predicate(node.label));
    const parent = { label, id, parent: null, children: found };
    found.forEach((child) => {
      child.parent = parent;
      remove(result, child);
    });
    result.push(parent);
  };

  const dotNetAssemblies = ["Microsoft", "System", "mscorlib", "netstandard", "WindowsBase", "PresentationFramework"];
  const metaGroupLabels: string[] = [];
  if (options.groupDotNet) {
    regroup((label) => dotNetAssemblies.includes(label), ".NET", "!.NET");
    metaGroupLabels.push(".NET");
  }

  const exeNamespaces = loaded.exes.map((name) => name.split(".")[0]);
  const knownNamespaces = [...exeNamespaces, ...dotNetAssemblies, ...metaGroupLabels];
  if (options.group3rdParty && exeNamespaces.length) {
    regroup((label) => !knownNamespaces.includes(label), "3rd-party", "!3rd-party");
    metaGroupLabels.push("3rd-party");
  }

  // assert the id are unique -- if they're not then CheckboxTree will throw an exception in the renderer
  // also assert that the parent fields are set correctly
  const unique = new Set<string>();
  const assertUnique = (node: GroupNode): void => {
    const id = node.id;
    if (unique.has(id)) {
      throw new Error(`Duplicate node id: ${id}`);
    }
    unique.add(id);
    if (isParent(node))
      node.children.forEach((child) => {
        assertUnique(child);
        if (child.parent !== node) {
          throw new Error(`Unexpected parent of:  ${id}`);
        }
      });
  };

  result.forEach(assertUnique);

  return result;
};
