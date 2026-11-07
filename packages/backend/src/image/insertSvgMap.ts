import { Document, DOMParser, Element, Node, XMLSerializer } from "@xmldom/xmldom";
import { assert, getOrThrow } from "../utils";
import { computePaddedHitArea } from "./computePaddedHitArea";

export const insertSvgMap = (
  svgStr: string,
  mapStr: string,
  nodeLabels: Map<string, string>,
  edgeLabels: Map<string, string>
): string => {
  const mapDoc = new DOMParser().parseFromString(mapStr.replace(/<!--[\s\S]*?-->\n?/g, ""), "image/svg+xml");
  const svgDoc = new DOMParser().parseFromString(svgStr.replace(/<!--[\s\S]*?-->\n?/g, ""), "image/svg+xml");

  const svg = svgDoc.getElementsByTagName("svg")[0];

  //const [tx, ty] = [-4, 316];
  const translation = getTranslation(svg);

  const areas = mapDoc.getElementsByTagName("area");

  // get edges from the area elements in the map
  const areaEdges = areas
    .filter((a) => a.getAttribute("shape") === "poly")
    .map((a) => ({ id: a.getAttribute("id")!, coords: a.getAttribute("coords")! }));

  assert(
    areaEdges.every((ae) => ae.id.includes("||")),
    "every areaEdge.id must contain ||"
  );
  assert(
    Array.from(areas).every((a) => !a.getAttribute("id")?.includes("||") || a.getAttribute("shape") === "poly"),
    "every map element with || in its id must be a polygon"
  );

  for (const { id, coords } of areaEdges) {
    // create a new polygon with class hit-edge whose points are translated from the area into SVG coordinates
    const polygon = svgDoc.createElement("polygon");
    polygon.setAttribute("class", "hit-edge");
    polygon.setAttribute("points", transformPoints(coords, translation));
    polygon.setAttribute("data-from-id", id);

    // find the SVG group for this edge
    const svgEdge = svgDoc.getElementById(id);
    assert(!!svgEdge);

    // find the path element within this group and insert the hit-edge polygon before it
    const svgPaths = svgEdge.getElementsByTagName("path");
    assert(svgPaths.length == 1);
    const svgPath = svgPaths[0];
    const svgParent = svgPath.parentElement;
    assert(!!svgParent);
    svgParent.insertBefore(polygon, svgPath);
    svgParent.insertBefore(svgDoc.createTextNode("\n"), svgPath);

    const label = getOrThrow(edgeLabels, id);
    addLabel(svgDoc, svgEdge, label);
  }

  for (const [id, label] of nodeLabels.entries()) {
    const svgNode = svgDoc.getElementById(id);
    assert(!!svgNode);
    addLabel(svgDoc, svgNode, label);
  }

  const style = svgDoc.createElement("style");
  style.appendChild(
    svgDoc.createTextNode(`
  .hit-edge {
    fill: transparent;
    stroke: transparent;
    stroke: blue;
  }
  .hit-edge:hover {
    stroke: green;
  }
  .hit-edge:hover ~ path {
    stroke: red;
  }
`)
  );

  svg.insertBefore(style, svg.firstChild);

  const newSvg = new XMLSerializer().serializeToString(svgDoc);
  return newSvg;
};

// Thickness (in px) of the padded hit area around each GraphViz spline.
const PADDING = 5;

// the code in computePaddedHitArea doesn't seem to work at all well -- maybe try to debug it later
const tryPaddedHitAreas = false;

const getTranslateIntegers = (transform: string): [number, number] => {
  const match = transform.match(/translate\(\s*(-?\d+)\s+(-?\d+)\s*\)/);
  if (!match) {
    throw new Error(`No translate(...) found in transform: ${transform}`);
  }
  return [parseInt(match[1], 10), parseInt(match[2], 10)];
};

const getFirstChildElement = (element: Element): Element | null => {
  let child = element.firstChild;
  while (child) {
    if (child.nodeType === Node.ELEMENT_NODE) return child as Element;
    child = child.nextSibling;
  }
  return null;
};

const getTranslation = (svg: Element): [number, number] => {
  // first child *element* (skips text nodes)
  const transform = getFirstChildElement(svg)?.getAttribute("transform") ?? "";
  assert(!!transform);
  const translate = getTranslateIntegers(transform);
  return [-translate[0], translate[1]];
};

const transformPoints = (coordsStr: string, translation: [number, number]): string => {
  const coords = coordsStr.split(",").map((s) => parseInt(s.trim(), 10));

  const points: [number, number][] = [];
  for (let i = 0; i < coords.length; i += 2) {
    points.push([coords[i], coords[i + 1]]);
  }

  const [tx, ty] = translation;
  const svgPoints: [number, number][] = points.map(([x, y]) => [x * 0.75 + tx, y * 0.75 - ty]);

  const padded = tryPaddedHitAreas ? computePaddedHitArea(svgPoints, PADDING) : svgPoints;
  const svgPointStr = padded.map((p) => `${p[0]},${p[1]}`).join(" ");
  return svgPointStr;
};

const addLabel = (svgDoc: Document, element: Element, label: string): void => {
  element.setAttribute("aria-label", label);
  const parent = element.parentNode;
  if (parent) {
    parent.insertBefore(svgDoc.createComment(label), element);
    parent.insertBefore(svgDoc.createTextNode("\n"), element);
  }
};
