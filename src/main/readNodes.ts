import { Node, IStrings } from "../shared-types";

export const readNodes = (assemblies: IStrings): Node[] => {
  const names: string[] = [];
  for (const name in assemblies) {
    names.push(name);
    names.push(...assemblies[name]);
  }
  names.sort();

  const done = new Set<string>();

  const result: Node[] = [];
  for (const name of names) {
    // names contains many duplicates
    if (done.has(name)) continue;
    else done.add(name);

    let partial = "";
    let nodes = result;

    for (const part of name.split(".")) {
      // increase the length of the partial name
      partial = !partial ? part : `${partial}.${part}`;
      // may have this node already -- if so then it's the last node because names are sorted -- else create it now
      if (!nodes.length || nodes[nodes.length - 1].label !== partial) nodes.push({ label: partial, isShown: true });
      const found = nodes[nodes.length - 1];
      if (partial !== name) {
        if (!found.children) found.children = [];
        nodes = found.children;
      }
    }
  }
  return result;
};
