import type { Leaf, NameTypes, Node, Parent } from "../shared-types";
import { isParent, nameNodeId, nodeIdToText } from "../shared-types";
import type { StringPredicate } from "./shared-types";
import { distinctor, options, remove, replace } from "./shared-types";

/*
  This is a depth-first implementation, could if needed change it to be breadth-first.
*/

export const convertLoadedToGroups = (
  names: string[],
  exes: string[],
  nameType: NameTypes
): {
  nodes: { [id: string]: Node };
  groups: Node[];
} => {
  // sort all names -- these names will become leaf nodes
  names.sort();
  // names many contain duplicate
  const distinctNames = distinctor<string>((lhs, rhs) => lhs === rhs);

  const result: Node[] = [];
  for (const name of names.filter(distinctNames)) {
    let partial = "";
    let nodes = result;

    let parent: Parent | null = null;
    for (const part of name.split(".")) {
      // increase the length of the partial name
      partial = !partial ? part : `${partial}.${part}`;
      // append the leaf if this is the leaf
      if (partial === name) {
        const newLeaf: Leaf = { label: name, nodeId: nameNodeId(nameType, name), parent };
        nodes.push(newLeaf);
      } else {
        // find or create the parent -- if it already exists then it's the last node, because names are sorted
        const newParent: Parent = { label: partial, nodeId: nameNodeId("group", partial), children: [], parent };
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
    const ungroupSingle = (nodes: Node[]): void => {
      nodes.slice().forEach((node) => {
        if (isParent(node)) {
          let children: Node[] | undefined = node.children;
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
    const parent = { label, nodeId: nameNodeId("group", id), parent: null, children: found };
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

  const exeNamespaces = exes.map((name) => name.split(".")[0]);
  const knownNamespaces = [...exeNamespaces, ...dotNetAssemblies, ...metaGroupLabels];
  if (options.group3rdParty && exeNamespaces.length) {
    regroup((label) => !knownNamespaces.includes(label), "3rd-party", "!3rd-party");
    metaGroupLabels.push("3rd-party");
  }

  // assert the id are unique -- if they're not then CheckboxTree will throw an exception in the renderer
  // also assert that the parent fields are set correctly
  const unique: { [id: string]: Node } = {};
  const assertUnique = (node: Node): void => {
    const id = nodeIdToText(node.nodeId);
    if (unique[id]) throw new Error(`Duplicate node id: ${id}`);
    unique[id] = node;
    if (isParent(node))
      node.children.forEach((child) => {
        assertUnique(child);
        if (child.parent !== node) {
          throw new Error(`Unexpected parent of:  ${id}`);
        }
      });
  };

  result.forEach(assertUnique);
  return { groups: result, nodes: unique };
};
