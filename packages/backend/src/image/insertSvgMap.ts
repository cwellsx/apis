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

  // The only polygons GraphViz emits inside an edge group are arrow-heads; mark them
  // before the hit-test polygons are inserted below.
  addArrowClasses(svgDoc);

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
  /* The graph is not a document to select. The labels are text, so the browser offers a text cursor over
     them and lets them be dragged over; this is the only place the graph would change the pointer, and it
     should not: the pointer is always the plain arrow. */
  svg {
    cursor: default;
    user-select: none;
  }
  /* A node's box is usually unfilled, and an unpainted interior is not hit-tested, so hovering inside a node
     would hit whatever is behind it -- the box of the node it is inside, or the graph's background. This
     makes the box a target whether it is painted or not. A node inside an open node is emitted after it, so
     it still wins over the open node's box. */
  .node > polygon,
  .cluster > polygon {
    pointer-events: all;
  }
  /* the hit-test polygons are invisible: they exist only to widen the target */
  .hit-edge {
    fill: transparent;
    stroke: transparent;
  }
  /* Hovering a node which can be opened or closed says so in green, whether it is closed or open, because an
     open one is emitted as a cluster. :has is what keeps a cluster's own box from matching when the mouse is
     over one of the nodes inside it, which is why the box and the label are matched, not the cluster itself.
     The stroke is widened, because a hairline of colour is too easily read as the node's own black border. */
  .collapsible:has(> polygon:hover) > polygon,
  .collapsible:has(> text:hover) > polygon {
    stroke: green;
    stroke-width: 2;
  }
  /* a leaf node is not clickable yet, and neither is an edge */
  .leaf:hover > polygon {
    stroke: red;
    stroke-width: 2;
  }
  .edge:hover path {
    stroke: red;
    stroke-width: 2;
  }
  .edge:hover .arrow {
    fill: red;
    stroke: red;
  }
`)
  );

  svg.insertBefore(style, svg.firstChild);

  removeAnchorWrappers(svgDoc);

  const newSvg = new XMLSerializer().serializeToString(svgDoc);
  // removing the <title>/<g>/<a> wrappers leaves blank lines; collapse them
  return newSvg.replace(/\n{2,}/g, "\n");
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

/*

SVG looks like this when removeAnchorWrappers is run

```
<!--Mono.Cecil-->
<g id="1073741828" class="node" aria-label="Mono.Cecil">
<title>1073741828</title>
<g id="a_1073741828"><a xlink:href="foo" xlink:title="Mono.Cecil">
<polygon fill="#fbfbfb" stroke="black" points="439.79,-204 382.21,-204 382.21,-168 439.79,-168 439.79,-204"/>
<text xml:space="preserve" text-anchor="middle" x="411" y="-183" font-family="Segoe UI" font-size="10.00">Mono.Cecil</text>
</a>
</g>
</g>

<!--Core → Mono.Cecil-->
<g id="1073741825||1073741828" class="edge" aria-label="Core → Mono.Cecil">
<title>1073741825-&gt;1073741828</title>
<g id="a_1073741825||1073741828"><a xlink:href="foo">
<polygon class="hit-edge" points="70.25,-256.75 198.5,-242.5 283.25,-227.5 373.25,-205 369.5,-203.5 282.5,-223.75 197.75,-238.75 71,-253" data-from-id="1073741825||1073741828"/>
<path fill="none" stroke="black" d="M70.49,-255.02C126.05,-250.52 255.58,-237.43 371.06,-204.14"/>
<polygon fill="black" stroke="black" points="371.78,-207.57 380.38,-201.39 369.8,-200.86 371.78,-207.57"/>
</a>
</g>
</g>
```

Effect on the output -- for each node/edge/cluster, this:

```javascript
<g id="X" class="node|edge|cluster">
  <title>...</title>            <-- removed
  <g id="a_X">                  <-- removed
    <a ...>                     <-- removed
      polygon / path / text     <-- reparented under the class <g>
    </a>
  </g>
</g>
```

becomes:

```javascript
<g id="X" class="node|edge|cluster">
  polygon / path / text
</g>
```


*/

// GraphViz wraps the body of each node/edge/cluster as <g id="a_..."><a>...</a></g>,
// with a sibling <title> emitted before it. Remove those wrappers, reparenting the
// children of <a> (polygon/path/text) directly under the enclosing class <g>.
const removeAnchorWrappers = (svgDoc: Document): void => {
  for (const anchor of Array.from(svgDoc.getElementsByTagName("a"))) {
    const wrapper = anchor.parentElement; // <g id="a_...">
    assert(!!wrapper);
    const group = wrapper.parentElement; // <g class="node|edge|cluster">
    assert(!!group);

    // reparent the children of <a> under the enclosing <g>, in place of the wrapper
    for (const child of Array.from(anchor.childNodes)) {
      group.insertBefore(child, wrapper);
    }

    // remove the now-empty wrapper (which still contains the empty <a>)
    group.removeChild(wrapper);

    // remove the <title> that GraphViz emitted before the wrapper
    const title = Array.from(group.childNodes).find(
      (child) => child.nodeType === Node.ELEMENT_NODE && (child as Element).tagName === "title"
    );
    if (title) group.removeChild(title);
  }
};

// The only polygons GraphViz emits inside an edge group are the arrow-heads. Mark every
// such polygon with class="arrow". This must run before the hit-test polygons are
// inserted, so that only the original polygons are matched.
const addArrowClasses = (svgDoc: Document): void => {
  for (const group of Array.from(svgDoc.getElementsByTagName("g"))) {
    if (group.getAttribute("class") !== "edge") continue;
    for (const polygon of Array.from(group.getElementsByTagName("polygon"))) {
      polygon.setAttribute("class", "arrow");
    }
  }
};
