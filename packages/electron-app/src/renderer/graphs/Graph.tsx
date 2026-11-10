import { EdgeId, EdgeInfo, EdgePopups, NodeId, textToEdgeId, textToNodeId } from "backend-ui";
import * as React from "react";
import { EdgePopup } from "./EdgePopup";
import "./Graph.css";
import { toGraphElement } from "./graphElement";
import { OnGraphEvent } from "../onEvent";
import { useKeyboard } from "../useKeyboard";
import { OnWheel } from "../useZoomPercent";

type GraphProps = {
  svg: string;
  edgePopups?: EdgePopups;
  zoomPercent: number;
  onWheelZoomPercent: OnWheel;
  onGraphEvent: OnGraphEvent;
};

// the edge under the mouse: its id, which is the key of edgePopups, and the info to show in its popup
type HoveredEdge = { edgeId: string; info: EdgeInfo };

// how far the popup is kept from the mouse, so that it doesn't sit under the pointer
const popupOffset = 12;

export const Graph: React.FunctionComponent<GraphProps> = (props: GraphProps) => {
  const divRef = React.useRef<HTMLDivElement>(null);
  const popupRef = React.useRef<HTMLDivElement>(null);
  const zoomPercent = props.zoomPercent;
  const keyboard = useKeyboard();
  const isFrozen = keyboard.shiftKey || keyboard.ctrlKey;
  const [hoveredEdge, setHoveredEdge] = React.useState<HoveredEdge | undefined>(undefined);

  React.useEffect(() => {
    const svg = divRef.current?.querySelector("svg");

    if (svg) {
      // Remember the SVG's original (100%) width/height once, so repeated
      // zoom changes scale from the original size instead of compounding.
      if (!svg.dataset.originalWidth) {
        svg.dataset.originalWidth = svg.getAttribute("width") ?? "";
      }
      if (!svg.dataset.originalHeight) {
        svg.dataset.originalHeight = svg.getAttribute("height") ?? "";
      }

      const scale = zoomPercent / 100;

      const setScaled = (attr: "width" | "height", original: string | undefined) => {
        if (!original) return;
        const value = Number.parseFloat(original);
        if (Number.isNaN(value)) return;
        // Keep the unit (e.g. "pt", "px") that Graphviz emitted.
        const unit = original.replace(/^[\d.]+/, "");
        svg.setAttribute(attr, `${value * scale}${unit}`);
      };

      setScaled("width", svg.dataset.originalWidth);
      setScaled("height", svg.dataset.originalHeight);
    }
  }, [zoomPercent, props.svg]);

  // while a modifier key is held the graph container gets a class, which the CSS uses for cursors
  const keyboardClassName = keyboard.shiftKey
    ? keyboard.ctrlKey
      ? "shiftKey ctrlKey"
      : "shiftKey"
    : keyboard.ctrlKey
      ? "ctrlKey"
      : undefined;

  const textToNodeOrEdgeId = (id: string, className: string): NodeId | EdgeId | undefined => {
    switch (className) {
      case "edge":
        return textToEdgeId(id);
      case "node":
        return textToNodeId(id);
      default:
        return undefined;
    }
  };

  const onClick = (e: React.MouseEvent) => {
    const target = e.target;
    if (!(target instanceof SVGElement)) return;
    const element = target.closest("[id][class]");
    if (!element) return;
    const { id, className } = element;
    console.log(`Clicked id="${id}" class="${className}"`);
    const nodeOrEdgeId = textToNodeOrEdgeId(id, className);
    if (!nodeOrEdgeId) return;

    props.onGraphEvent({
      id: nodeOrEdgeId,
      event: {
        altKey: e.altKey,
        button: e.button,
        buttons: e.buttons,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
      },
    });
  };

  const findHoveredEdge = (target: EventTarget): HoveredEdge | undefined => {
    if (!(target instanceof Element)) return undefined;
    const element = target.closest("[id]");
    const graphElement = element ? toGraphElement(element) : undefined;
    if (graphElement?.graphClass !== "edge") return undefined;

    // an edge whose bundle is not known shows no popup at all
    const info = props.edgePopups?.get(graphElement.id);
    return info?.labels.length ? { edgeId: graphElement.id, info } : undefined;
  };

  const setPopupPosition = (clientX: number, clientY: number) => {
    const popup = popupRef.current;
    // the popup is positioned by writing transform, so that following the mouse doesn't re-render
    if (popup) popup.style.transform = `translate(${clientX + popupOffset}px, ${clientY + popupOffset}px)`;
  };

  const onMouseMove = (e: React.MouseEvent) => {
    // while a modifier key is held an existing popup is frozen: it neither moves nor changes, so that
    // the mouse can travel from the edge to the popup itself
    if (isFrozen && hoveredEdge) return;

    setPopupPosition(e.clientX, e.clientY);

    const next = findHoveredEdge(e.target);
    if (next?.edgeId !== hoveredEdge?.edgeId) setHoveredEdge(next);
  };

  const onMouseLeave = () => {
    // a frozen popup outlives the mouse leaving the graph, otherwise it could never be reached
    if (!isFrozen) setHoveredEdge(undefined);
  };

  // TODO add onClick
  return (
    <>
      <div
        className={keyboardClassName}
        onWheel={props.onWheelZoomPercent}
        ref={divRef}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        dangerouslySetInnerHTML={{ __html: props.svg }}
        onClick={onClick}
      ></div>
      <div className="zoom bottom">{`${props.zoomPercent}%`}</div>
      <EdgePopup divRef={popupRef} info={hoveredEdge?.info} />
    </>
  );
};
