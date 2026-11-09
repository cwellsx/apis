import { fireEvent, render } from "@testing-library/react";
import { EdgeLabels, EdgePopups, textToNodeId } from "backend-ui";
import * as React from "react";
import { Graph } from "../../electron-app/src/renderer/Graph";

// a stand-in for what GraphViz plus insertSvgMap produce: an id and a class on each <g>, where an
// edge id is its two node ids joined by ||
const svg = `
  <svg width="100pt" height="50pt" viewBox="0 0 100 50">
    <g id="1073741825" class="node"><polygon points="0,0 10,0 10,10 0,10"/></g>
    <g id="1073741828" class="node"><polygon points="90,40 100,40 100,50 90,50"/></g>
    <g id="1073741825||1073741828" class="edge">
      <polygon class="hit-edge" points="10,10 90,40 89,41 11,11" data-from-id="1073741825||1073741828"/>
      <path d="M10,10 L90,40"/>
    </g>
  </svg>`;

const edgeId = "1073741825||1073741828";
const nodeId = "1073741825";

const edgePopups: EdgePopups = new Map<string, EdgeLabels[]>([
  [
    edgeId,
    [
      {
        client: { label: "Core", nodeId: textToNodeId(nodeId) },
        server: { label: "Mono.Cecil", nodeId: textToNodeId("1073741828") },
      },
    ],
  ],
]);

const graph = (zoomPercent: number) => (
  <Graph
    svg={svg}
    edgePopups={edgePopups}
    zoomPercent={zoomPercent}
    onWheelZoomPercent={vi.fn()}
    onGraphEvent={vi.fn()}
  />
);

const renderGraph = (zoomPercent = 100) => {
  const result = render(graph(zoomPercent));
  const edge = result.container.querySelector(`[id="${edgeId}"]`) as SVGElement;
  const node = result.container.querySelector(`[id="${nodeId}"]`) as SVGElement;
  const popup = result.container.querySelector(".edge-popup") as HTMLDivElement;
  return { ...result, edge, node, popup };
};

test("shows the id of the hovered edge, and hides when some other element is hovered", () => {
  const { edge, node, popup } = renderGraph();
  expect(popup.style.display).toBe("none");

  fireEvent.mouseMove(edge, { clientX: 30, clientY: 40 });
  expect(popup.style.display).toBe("block");
  expect(popup.textContent).toBe(edgeId);

  // a node is not an edge, so hovering one of those hides the popup again
  fireEvent.mouseMove(node, { clientX: 5, clientY: 5 });
  expect(popup.style.display).toBe("none");
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

  // useKeyboard listens on document, which is where a key press arrives
  fireEvent.keyDown(document, { key: "Shift", shiftKey: true });

  fireEvent.mouseMove(node, { clientX: 5, clientY: 5 });
  fireEvent.mouseOut(edge, { relatedTarget: document.body });
  expect(popup.style.display).toBe("block");
  expect(popup.textContent).toBe(edgeId);
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