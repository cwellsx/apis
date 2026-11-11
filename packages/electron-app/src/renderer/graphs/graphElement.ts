// GraphViz puts one of these classes on every element it emits. In the post-processed SVG these are
// currently the only elements which have an id attribute, but other class names may exist too (and
// may be added later), so anything else is ignored rather than rejected.
export type GraphClass = "edge" | "node" | "cluster" | "graph";

const graphClasses: GraphClass[] = ["edge", "node", "cluster", "graph"];

export type GraphElement = { id: string; graphClass: GraphClass | undefined; classNames: string[] };

// The class of an element in the SVG namespace can't be read from the `className` property: there it
// is an SVGAnimatedString, not the string that Element.className is declared to be. Reading the
// attribute is always a plain string, whatever the namespace.
const readClassNames = (element: Element): string[] =>
  (element.getAttribute("class") ?? "").split(/\s+/).filter((name) => name.length > 0);

export const toGraphElement = (element: Element): GraphElement | undefined => {
  const id = element.getAttribute("id");
  // the hit-area polygons and the arrow-heads have no id, so they are never graph elements
  if (!id) return undefined;

  const classNames = readClassNames(element);
  const graphClass = graphClasses.find((value) => classNames.includes(value));
  // the class names are returned as well, so that a caller can recognise the markers the renderer adds
  // alongside GraphViz's own class -- `collapsible` is one: the same one the injected style colours green
  return { id, graphClass, classNames };
};
