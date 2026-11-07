import { DOMParser, Element, Node, XMLSerializer } from "@xmldom/xmldom";
import { assert } from "../utils";
import { computePaddedHitArea } from "./computePaddedHitArea";

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

export const getTranslation = (svg: Element): [number, number] => {
  // first child *element* (skips text nodes)
  const transform = getFirstChildElement(svg)?.getAttribute("transform") ?? "";
  assert(!!transform);
  const translate = getTranslateIntegers(transform);
  return [-translate[0], translate[1]];
};

export const insertSvgMap = (svgStr: string, mapStr: string): string => {
  const mapDoc = new DOMParser().parseFromString(mapStr, "image/svg+xml");
  const svgDoc = new DOMParser().parseFromString(svgStr, "image/svg+xml");

  const svg = svgDoc.getElementsByTagName("svg")[0];

  //const [tx, ty] = [-4, 316];
  const [tx, ty] = getTranslation(svg);

  const areas = mapDoc.getElementsByTagName("area");
  const edgeAreas = areas.filter(
    (element) => element.getAttribute("shape") == "poly" && (element.getAttribute("id")?.includes("||") ?? false)
  );

  for (const edgeArea of edgeAreas) {
    const id = edgeArea.getAttribute("id");
    assert(!!id);

    const coordsStr = edgeArea.getAttribute("coords");
    if (!coordsStr) continue;

    const coords = coordsStr.split(",").map((s) => parseInt(s.trim(), 10));

    const points: [number, number][] = [];
    for (let i = 0; i < coords.length; i += 2) {
      points.push([coords[i], coords[i + 1]]);
    }

    const svgPoints: [number, number][] = points.map(([x, y]) => [x * 0.75 + tx, y * 0.75 - ty]);

    const padded = tryPaddedHitAreas ? computePaddedHitArea(svgPoints, PADDING) : svgPoints;
    const svgPointStr = padded.map((p) => `${p[0]},${p[1]}`).join(" ");

    const polygon = svgDoc.createElement("polygon");
    polygon.setAttribute("class", "hit-edge");
    polygon.setAttribute("points", svgPointStr);
    polygon.setAttribute("data-from-id", id);

    const svgEdge = svgDoc.getElementById(id);
    if (!svgEdge) continue;
    const svgPaths = svgEdge.getElementsByTagName("path");
    if (svgPaths.length != 1) continue;
    const svgPath = svgPaths[0];
    const svgParent = svgPath.parentElement;
    if (!svgParent) continue;
    svgParent.insertBefore(polygon, svgPath);
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
