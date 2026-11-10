import { EdgeInfo, EdgeLabels, nodeIdToText } from "backend-ui";
import * as React from "react";
import "./EdgePopup.css";

type EdgePopupProps = { divRef: React.Ref<HTMLDivElement>; info: EdgeInfo | undefined };

// the same identity as an edge id in the SVG: the ids of the two nodes, joined
const pairKey = (pair: EdgeLabels): string =>
  `${nodeIdToText(pair.client.nodeId)}||${nodeIdToText(pair.server.nodeId)}`;

// The popup is never unmounted: it is hidden with display instead, so that its ref is always valid and
// Graph can position it imperatively on every mouse move (writing transform, without re-rendering).
// Each pair of the bundle is one row of source, arrow and destination. The info also carries the two
// nodes of the edge itself, for a header.
export const EdgePopup: React.FunctionComponent<EdgePopupProps> = (props: EdgePopupProps) => (
  <div className="edge-popup" ref={props.divRef} style={{ display: props.info?.labels.length ? "block" : "none" }}>
    {props.info?.labels.map((pair) => (
      <div className="edge-popup-row" key={pairKey(pair)}>
        <div className="edge-popup-source">{pair.client.label}</div>
        <div className="edge-popup-arrow">{"→"}</div>
        <div className="edge-popup-destination">{pair.server.label}</div>
      </div>
    ))}
  </div>
);
