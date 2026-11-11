import { GraphClass, toGraphElement } from "../../electron-app/src/renderer/graphs/graphElement";

const svgNamespace = "http://www.w3.org/2000/svg";

const svgElement = (tagName: string, attributes: { [key: string]: string }): SVGElement => {
  const element = document.createElementNS(svgNamespace, tagName);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
};

describe("toGraphElement", () => {
  test("reads the id and the class of a graph element", () => {
    const element = svgElement("g", { id: "1073741825||1073741828", class: "edge" });
    expect(toGraphElement(element)).toEqual({ id: "1073741825||1073741828", graphClass: "edge", classNames: ["edge"] });
  });

  test("recognises every class GraphViz emits", () => {
    const cases: [string, GraphClass][] = [
      ["edge", "edge"],
      ["node", "node"],
      ["cluster", "cluster"],
      ["graph", "graph"],
    ];
    cases.forEach(([className, graphClass]) =>
      expect(toGraphElement(svgElement("g", { id: "x", class: className }))).toEqual({
        id: "x",
        graphClass,
        classNames: [className],
      })
    );
  });

  test("keeps the classes which are not graph classes, without being confused by them", () => {
    // The renderer adds its own markers to the nodes it makes clickable, and they must not be mistaken for
    // GraphViz's classes, which are what says which kind of element this is. This is also the pair of
    // classes the click handler tells apart: only the first is clickable.
    expect(toGraphElement(svgElement("g", { id: "x", class: "node collapsible" }))).toEqual({
      id: "x",
      graphClass: "node",
      classNames: ["node", "collapsible"],
    });
    expect(toGraphElement(svgElement("g", { id: "x", class: "node leaf" }))).toEqual({
      id: "x",
      graphClass: "node",
      classNames: ["node", "leaf"],
    });
    expect(toGraphElement(svgElement("polygon", { id: "x", class: "hit-edge" }))).toEqual({
      id: "x",
      graphClass: undefined,
      classNames: ["hit-edge"],
    });
    expect(toGraphElement(svgElement("g", { id: "x" }))).toEqual({ id: "x", graphClass: undefined, classNames: [] });
  });

  test("returns undefined for elements without an id", () => {
    // the hit-area polygons and the arrow-heads have a class but no id, so they are not graph elements
    expect(toGraphElement(svgElement("polygon", { class: "hit-edge" }))).toBeUndefined();
    expect(toGraphElement(svgElement("path", { class: "arrow" }))).toBeUndefined();
    expect(toGraphElement(svgElement("g", {}))).toBeUndefined();
  });

  test("reads the class attribute, because the className property is not a string", () => {
    const element = svgElement("g", { id: "x", class: "edge" });

    // on an SVG element the className *property* is an SVGAnimatedString, so an implementation which
    // read that instead of the attribute would match no class at all. This assertion is also what
    // makes the tests above meaningful -- if jsdom ever stopped modelling it, they would pass for an
    // implementation which used the property, and so would stop guarding anything.
    expect(typeof element.className).toBe("object");
    expect(toGraphElement(element)).toEqual({ id: "x", graphClass: "edge", classNames: ["edge"] });
  });
});
