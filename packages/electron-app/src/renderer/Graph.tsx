import { EdgeId, NodeId, textToEdgeId, textToNodeId } from "backend-ui";
import * as React from "react";
import "./Graph.css";
import { log } from "./log";
import { OnGraphEvent } from "./onEvent";
import { OnWheel } from "./useZoomPercent";

type GraphProps = { svg: string; zoomPercent: number; onWheelZoomPercent: OnWheel; onGraphEvent: OnGraphEvent };

export const Graph: React.FunctionComponent<GraphProps> = (props: GraphProps) => {
  const divRef = React.useRef<HTMLDivElement>(null);
  const zoomPercent = props.zoomPercent;

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

  React.useEffect(() => {
    // like https://github.com/donavon/use-event-listener

    const keyboardEvent: (event: KeyboardEvent) => void = (event) => {
      if (event.repeat) return; // don't spike the CPU if a key is held down
      const shiftKey: boolean = event.shiftKey;
      const ctrlKey: boolean = event.ctrlKey;
      const newClassName: string | undefined = shiftKey
        ? ctrlKey
          ? "shiftKey ctrlKey"
          : "shiftKey"
        : ctrlKey
          ? "ctrlKey"
          : undefined;
      log(`setClassName(${newClassName})`);
    };
    document.addEventListener("keydown", keyboardEvent);
    document.addEventListener("keyup", keyboardEvent);

    return () => {
      document.removeEventListener("keydown", keyboardEvent);
      document.removeEventListener("keyup", keyboardEvent);
    };
  });

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

  // TODO add onClick
  return (
    <>
      <div
        onWheel={props.onWheelZoomPercent}
        ref={divRef}
        dangerouslySetInnerHTML={{ __html: props.svg }}
        onClick={onClick}
      ></div>
      <div className="zoom bottom">{`${props.zoomPercent}%`}</div>
    </>
  );
};
