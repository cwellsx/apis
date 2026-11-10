import { EdgeInfo, EdgeLabels, nodeIdToText } from "backend-ui";
import * as React from "react";
import "./EdgePopup.css";

type EdgePopupProps = { divRef: React.Ref<HTMLDivElement>; info: EdgeInfo | undefined };

// the same identity as an edge id in the SVG: the ids of the two nodes, joined
const pairKey = (pair: EdgeLabels): string =>
  `${nodeIdToText(pair.client.nodeId)}||${nodeIdToText(pair.server.nodeId)}`;

// one row: source, arrow, destination. The header row is the edge itself, and each row below it is one
// pair of the bundle one level down.
type PopupRowProps = { source: string; destination: string; isHeader?: boolean };

const PopupRow: React.FunctionComponent<PopupRowProps> = (props: PopupRowProps) => (
  <div className={props.isHeader ? "edge-popup-row edge-popup-header" : "edge-popup-row"}>
    <div className="edge-popup-source">{props.source}</div>
    <div className="edge-popup-arrow">{"→"}</div>
    <div className="edge-popup-destination">{props.destination}</div>
  </div>
);

// The popup is never unmounted: it is hidden with display instead, so that its ref is always valid and
// Graph can position it imperatively on every mouse move (writing transform, without re-rendering).
// That is why both branches below return the same div.
export const EdgePopup: React.FunctionComponent<EdgePopupProps> = (props: EdgePopupProps) => {
  const info = props.info;
  if (!info) return <div className="edge-popup" ref={props.divRef} style={{ display: "none" }} />;

  return (
    <div className="edge-popup" ref={props.divRef} style={{ display: "block" }}>
      <PopupRow source={info.nodes.client.label} destination={info.nodes.server.label} isHeader />
      {info.labels.map((pair) => (
        <PopupRow key={pairKey(pair)} source={pair.client.label} destination={pair.server.label} />
      ))}
    </div>
  );
};
