import { NameTypes, toNameNodeId } from "./nodeIds";
import type { Leaf, Node, Parent } from "./shared-types";
import { isParent } from "./shared-types";
import { options, remove, replace } from "./utils";
import { uniqueStrings } from "./utils/remove";

type Result = {
  leafs: { [id: string]: Node };
  groups: Node[];
};

const createFlatClusters = (names: string[], nameType: NameTypes): Result => {
  const groups: Node[] = [];
  const leafs: { [name: string]: Node } = {};

  for (const name of names) {
    const newLeaf: Leaf = { label: name, nodeId: toNameNodeId(nameType, name), parent: null };
    groups.push(newLeaf);
    leafs[name] = newLeaf;
  }

  return { groups, leafs };
};

// called from convertLoadedToCustom
export const createNestedClusters = (names: string[], nameType: NameTypes, separator = "."): Result => {
  const groups: Node[] = [];
  const leafs: { [name: string]: Node } = {};

  // This is a depth-first implementation, could if needed change it to be breadth-first.
  for (const name of names) {
    let partial = "";
    let nodes = groups;

    let parent: Parent | null = null;
    for (const part of name.split(separator)) {
      // increase the length of the partial name
      partial = !partial ? part : `${partial}${separator}${part}`;
      // append the leaf if this is the leaf
      if (partial === name) {
        const newLeaf: Leaf = { label: name, nodeId: toNameNodeId(nameType, name), parent };
        nodes.push(newLeaf);
        leafs[name] = newLeaf;
      } else {
        // find or create the parent -- if it already exists then it's the last node, because names are sorted
        const newParent: Parent = { label: partial, nodeId: toNameNodeId("group", partial), children: [], parent };
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
    ungroupSingle(groups);
  }

  return { groups, leafs };
};

// called from convertLoadedToReferences
export const convertNamesToNodes = (
  names: string[],
  exes: string[],
  nameType: NameTypes,
  nestedClusters: boolean
): Result => {
  // sort all names -- these names will become leaf nodes -- names may contain duplicate
  names = uniqueStrings(names).sort();

  const { leafs, groups } = nestedClusters
    ? createNestedClusters(names, nameType)
    : createFlatClusters(names, nameType);

  // create a new root group and move into all subtrees whose label matches the predicate
  const regroup = (predicate: (name: string) => boolean, label: string, id: string): void => {
    const found = groups.filter((node) => predicate(node.label));
    const parent = { label, nodeId: toNameNodeId("group", id), parent: null, children: found };
    found.forEach((child) => {
      child.parent = parent;
      remove(groups, child);
    });
    groups.push(parent);
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

  return { groups, leafs };
};
