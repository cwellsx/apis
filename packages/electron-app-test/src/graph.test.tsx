import { fireEvent, render, within } from "@testing-library/react";
import { AnyNodeType, EdgeInfo, EdgePopups, GraphEvent, Node, NodeType, textToNodeId } from "backend-ui";
import * as React from "react";
import { Graph } from "../../electron-app/src/renderer/graphs";

// a stand-in for what GraphViz plus insertSvgMap produce: an id and a class on each <g>, where an
// edge id is its two node ids joined by ||
const svg = `
  <svg width="100pt" height="50pt" viewBox="0 0 100 50">
    <g id="1073741825" class="node collapsible"><polygon points="0,0 10,0 10,10 0,10"/></g>
    <g id="1073741828" class="node leaf"><polygon points="90,40 100,40 100,50 90,50"/></g>
    <g id="999" class="cluster collapsible">
      <polygon points="20,20 30,20 30,30 20,30"/>
      <g id="1000" class="node collapsible"><polygon points="22,22 28,22 28,28 22,28"/></g>
    </g>
    <g id="1073741825||1073741828" class="edge">
      <polygon class="hit-edge" points="10,10 90,40 89,41 11,11" data-from-id="1073741825||1073741828"/>
      <path d="M10,10 L90,40"/>
    </g>
    <g id="1073741828||1073741825" class="edge">
      <polygon class="hit-edge" points="90,40 10,10 11,11 89,41" data-from-id="1073741828||1073741825"/>
      <path d="M90,40 L10,10"/>
    </g>
    <g id="1073741825||1073741829" class="edge">
      <polygon class="hit-edge" points="10,10 40,30 41,29 11,11" data-from-id="1073741825||1073741829"/>
      <path d="M10,10 L40,30"/>
    </g>
  </svg>`;

const edgeId = "1073741825||1073741828";
const nodeId = "1073741825";
// a node which can be opened or closed: emitted as a node while closed and as a cluster while open
const clusterId = "999";
const insideClusterId = "1000";
// a leaf: a node which cannot be opened, so clicking it does nothing yet
const leafNodeId = "1073741828";
// this edge is not in edgePopups, i.e. its bundle is unknown
const noDataEdgeId = "1073741828||1073741825";
// this edge's entry has no pairs, as an edge to a method has: nothing is one level below a method
const emptyEdgeId = "1073741825||1073741829";

// a node of the kind which one end of an edge can be
const makeNode = (label: string, nodeId: string, type: AnyNodeType): Node => ({
  label,
  nodeId: textToNodeId(nodeId),
  parent: null,
  type,
  isVisible: true,
  collapsible: "none",
});

// the labels are one level below the edge's own nodes: namespaces inside the two assemblies
const edgePopups: EdgePopups = new Map<string, EdgeInfo>([
  [
    edgeId,
    {
      nodes: {
        client: makeNode("Core", nodeId, NodeType.Assembly),
        server: makeNode("Mono.Cecil", "1073741828", NodeType.Assembly),
      },
      labels: [
        {
          client: { label: "Core.Cecil", nodeId: textToNodeId("5385486336") },
          server: { label: "Mono.Cecil.Cil", nodeId: textToNodeId("5385486340") },
        },
      ],
    },
  ],
  [
    emptyEdgeId,
    {
      nodes: {
        client: makeNode("Core", nodeId, NodeType.Assembly),
        server: makeNode("LoadAssemblies", "1073741829", NodeType.Method),
      },
      labels: [],
    },
  ],
]);

const onGraphEvent = vi.fn();

beforeEach(() => onGraphEvent.mockClear());

// the ids of the events the graph has sent to the backend
const sentIds = (): unknown[] => onGraphEvent.mock.calls.map((call) => (call[0] as GraphEvent).id);

const graph = (zoomPercent: number) => (
  <Graph
    svg={svg}
    edgePopups={edgePopups}
    zoomPercent={zoomPercent}
    onWheelZoomPercent={vi.fn()}
    onGraphEvent={onGraphEvent}
  />
);

const renderGraph = (zoomPercent = 100) => {
  const result = render(graph(zoomPercent));
  const edge = result.container.querySelector(`[id="${edgeId}"]`) as SVGElement;
  const noDataEdge = result.container.querySelector(`[id="${noDataEdgeId}"]`) as SVGElement;
  const emptyEdge = result.container.querySelector(`[id="${emptyEdgeId}"]`) as SVGElement;
  const node = result.container.querySelector(`[id="${nodeId}"]`) as SVGElement;
  const leaf = result.container.querySelector(`[id="${leafNodeId}"]`) as SVGElement;
  const cluster = result.container.querySelector(`[id="${clusterId}"]`) as SVGElement;
  const insideCluster = result.container.querySelector(`[id="${insideClusterId}"]`) as SVGElement;
  const popup = result.container.querySelector(".edge-popup") as HTMLDivElement;
  return { ...result, edge, noDataEdge, emptyEdge, node, leaf, cluster, insideCluster, popup };
};

test("shows each pair of the hovered edge's bundle as source, arrow and destination", () => {
  const { edge, popup } = renderGraph();
  expect(popup.style.display).toBe("none");

  fireEvent.mouseMove(edge, { clientX: 30, clientY: 40 });
  expect(popup.style.display).toBe("block");

  // the first row is the header, so this is the first row of the bundle itself
  const row = popup.querySelector(".edge-popup-row:not(.edge-popup-header)") as HTMLDivElement;
  expect(row.children).toHaveLength(3);
  expect(row.children[0].textContent).toBe("Core.Cecil");
  expect(row.children[1].textContent).toBe("→");
  expect(row.children[2].textContent).toBe("Mono.Cecil.Cil");
});

test("shows the edge's own two nodes as a header, each named with its type's icon", () => {
  const { edge, popup } = renderGraph();
  fireEvent.mouseMove(edge, { clientX: 30, clientY: 40 });

  const header = popup.firstElementChild as HTMLDivElement;
  expect(header.className).toContain("edge-popup-header");
  expect(header.children).toHaveLength(3);

  // the client's icon comes before its label, and the server's icon after its label. Each icon names the
  // kind of node it stands for, which the label on its own doesn't say
  const source = header.children[0] as HTMLElement;
  const destination = header.children[2] as HTMLElement;
  expect(source.firstElementChild?.tagName.toLowerCase()).toBe("svg");
  expect(source.querySelector('[role="img"]')?.getAttribute("aria-label")).toBe("Assembly");
  expect(within(source).getByText("Core")).toBeTruthy();
  expect(header.children[1].textContent).toBe("→");
  expect(within(destination).getByText("Mono.Cecil")).toBeTruthy();
  expect(destination.lastElementChild?.tagName.toLowerCase()).toBe("svg");
  expect(destination.querySelector('[role="img"]')?.getAttribute("aria-label")).toBe("Assembly");

  // the pairs below the header are labels only, so they have no icons
  const row = popup.querySelector(".edge-popup-row:not(.edge-popup-header)") as HTMLDivElement;
  expect(row.querySelector("svg")).toBeNull();
});

test("hides when a node is hovered, and shows nothing for an edge with no bundle", () => {
  const { edge, noDataEdge, node, popup } = renderGraph();

  // its bundle is unknown, so this edge has no popup
  fireEvent.mouseMove(noDataEdge, { clientX: 30, clientY: 40 });
  expect(popup.style.display).toBe("none");

  fireEvent.mouseMove(edge, { clientX: 30, clientY: 40 });
  expect(popup.style.display).toBe("block");

  // a node is not an edge, so hovering one of those hides the popup again
  fireEvent.mouseMove(node, { clientX: 5, clientY: 5 });
  expect(popup.style.display).toBe("none");
});

test("shows a header and no pairs for an edge whose bundle is empty", () => {
  const { emptyEdge, popup } = renderGraph();

  fireEvent.mouseMove(emptyEdge, { clientX: 30, clientY: 40 });

  expect(popup.style.display).toBe("block");
  // the header is the only row: an edge to a method has nothing below it
  expect(popup.querySelectorAll(".edge-popup-row")).toHaveLength(1);
  const header = popup.firstElementChild as HTMLDivElement;
  expect(header.className).toContain("edge-popup-header");
  expect(within(header).getByText("LoadAssemblies")).toBeTruthy();
  const destination = header.children[2] as HTMLElement;
  expect(destination.querySelector('[role="img"]')?.getAttribute("aria-label")).toBe("Method");
});

test("follows the mouse", () => {
  const { edge, popup } = renderGraph();

  fireEvent.mouseMove(edge, { clientX: 30, clientY: 40 });
  expect(popup.style.transform).toBe("translate(42px, 52px)"); // the mouse position plus popupOffset

  fireEvent.mouseMove(edge, { clientX: 31, clientY: 41 });
  expect(popup.style.transform).toBe("translate(43px, 53px)");
});

test("hides when the mouse leaves the graph", () => {
  const { edge, popup } = renderGraph();
  fireEvent.mouseMove(edge, { clientX: 30, clientY: 40 });
  expect(popup.style.display).toBe("block");

  // React synthesises onMouseLeave from mouseout, so that is the event to dispatch
  fireEvent.mouseOut(edge, { relatedTarget: document.body });
  expect(popup.style.display).toBe("none");
});

test("neither moves nor hides while a modifier key is held", () => {
  const { edge, node, popup } = renderGraph();
  fireEvent.mouseMove(edge, { clientX: 30, clientY: 40 });
  const transform = popup.style.transform;
  const text = popup.textContent;

  // useKeyboard listens on document, which is where a key press arrives
  fireEvent.keyDown(document, { key: "Shift", shiftKey: true });

  fireEvent.mouseMove(node, { clientX: 5, clientY: 5 });
  fireEvent.mouseOut(edge, { relatedTarget: document.body });
  expect(popup.style.display).toBe("block");
  expect(popup.textContent).toBe(text);
  expect(popup.style.transform).toBe(transform);

  // releasing the key lets the popup follow the mouse again
  fireEvent.keyUp(document, { key: "Shift" });
  fireEvent.mouseMove(edge, { clientX: 70, clientY: 20 });
  expect(popup.style.transform).toBe("translate(82px, 32px)");
});

test("keeps the position which was written imperatively when Graph re-renders", () => {
  const { edge, popup, rerender } = renderGraph();
  fireEvent.mouseMove(edge, { clientX: 30, clientY: 40 });

  rerender(graph(110));

  expect(popup.style.display).toBe("block");
  expect(popup.style.transform).toBe("translate(42px, 52px)");
});

// a click on a node which can be opened or closed is sent to the backend, which toggles it
test("sends a click on a node as that node's id, whichever of its elements was clicked", () => {
  const { node } = renderGraph();

  fireEvent.click(node.firstElementChild as Element);

  expect(sentIds()).toEqual([textToNodeId(nodeId)]);
});

// an open node is emitted as a cluster rather than as a node, and clicking inside it hits the innermost
// element with an id: the node which was clicked, not the cluster around it
test("sends a click on an open node's cluster, and on a node inside it, as that node's id", () => {
  const { cluster, insideCluster } = renderGraph();

  fireEvent.click(cluster.firstElementChild as Element);
  fireEvent.click(insideCluster.firstElementChild as Element);

  expect(sentIds()).toEqual([textToNodeId(clusterId), textToNodeId(insideClusterId)]);
});

// a leaf and an edge are not clickable yet, so the renderer sends nothing and there is nothing to fail
test("sends nothing when a leaf or an edge is clicked", () => {
  const { leaf, edge } = renderGraph();

  fireEvent.click(leaf.firstElementChild as Element);
  fireEvent.click(edge.firstElementChild as Element);

  expect(sentIds()).toEqual([]);
});
