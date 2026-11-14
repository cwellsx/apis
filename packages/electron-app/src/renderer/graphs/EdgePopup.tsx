import { AnyNodeType, EdgeInfo, EdgeLabels, Label, nodeIdToText } from "backend-ui";
import * as React from "react";
import { toNodeIcon } from "../nodeIcon";
import "./EdgePopup.css";

type EdgePopupProps = { divRef: React.Ref<HTMLDivElement>; info: EdgeInfo | undefined };

// the same identity as an edge id in the SVG: the ids of the two nodes, joined
const pairKey = (pair: EdgeLabels): string =>
  `${nodeIdToText(pair.client.nodeId)}||${nodeIdToText(pair.server.nodeId)}`;

// one row: source, arrow, destination. The header row is the edge itself, and each row below it is one
// pair of the bundle one level down. Only the header has icons, one for each of the two nodes.
type PopupRowProps = {
  source: string;
  destination: string;
  isHeader?: boolean;
  sourceIcon?: React.ReactNode;
  destinationIcon?: React.ReactNode;
  // an icon between a label and the arrow, for a label whose kind is not the one the column's corner shows
  sourceException?: React.ReactNode;
  destinationException?: React.ReactNode;
  // the kind most of a column's labels are, positioned outside the flow on the header's bottom edge
  sourceCorner?: React.ReactNode;
  destinationCorner?: React.ReactNode;
};

const PopupRow: React.FunctionComponent<PopupRowProps> = (props: PopupRowProps) => (
  <div className={rowClass(props)}>
    <div className="edge-popup-source">
      {props.sourceIcon}
      {props.source}
      {props.sourceException && <span className="edge-popup-exception">{props.sourceException}</span>}
      {props.sourceCorner && <span className="edge-popup-corner">{props.sourceCorner}</span>}
    </div>
    <div className="edge-popup-arrow">{"→"}</div>
    <div className="edge-popup-destination">
      {props.destinationCorner && <span className="edge-popup-corner">{props.destinationCorner}</span>}
      {props.destinationException && <span className="edge-popup-exception">{props.destinationException}</span>}
      {props.destination}
      {props.destinationIcon}
    </div>
  </div>
);

const rowClass = (props: PopupRowProps): string =>
  ["edge-popup-row", props.isHeader && "edge-popup-header"].filter(Boolean).join(" ");

// The kind most of a column's labels are, which is the one the corner shows: the labels of any other kind are the
// exceptions, and each carries its own icon between its text and the arrow. Unconditional for now -- a rule which
// withholds the corner when a column is evenly mixed can come later.
const defaultType = (labels: Label[]): AnyNodeType | undefined => {
  const counts = new Map<AnyNodeType, number>();
  labels.forEach((label) => counts.set(label.type, (counts.get(label.type) ?? 0) + 1));
  return [...counts.entries()].sort((x, y) => y[1] - x[1])[0]?.[0];
};

// The popup is never unmounted: it is hidden with display instead, so that its ref is always valid and
// Graph can position it imperatively on every mouse move (writing transform, without re-rendering).
// That is why both branches below return the same div.
export const EdgePopup: React.FunctionComponent<EdgePopupProps> = (props: EdgePopupProps) => {
  const info = props.info;
  if (!info) return <div className="edge-popup" ref={props.divRef} style={{ display: "none" }} />;

  const clientType = defaultType(info.labels.map((pair) => pair.client));
  const serverType = defaultType(info.labels.map((pair) => pair.server));

  // the header is the edge itself, so its two ends are nodes, each with the icon for its node type. The corner
  // icons say what kind most of each column's labels are -- out of the flow, on the header's bottom edge, so that a
  // column of one kind is not a column of identical icons and the table itself is unchanged.
  return (
    <div className="edge-popup" ref={props.divRef} style={{ display: "block" }}>
      <PopupRow
        source={info.nodes.client.label}
        destination={info.nodes.server.label}
        isHeader
        sourceIcon={toNodeIcon(info.nodes.client.type)}
        destinationIcon={toNodeIcon(info.nodes.server.type)}
        sourceCorner={clientType === undefined ? undefined : toNodeIcon(clientType)}
        destinationCorner={serverType === undefined ? undefined : toNodeIcon(serverType)}
      />
      {info.labels.map((pair) => (
        <PopupRow
          key={pairKey(pair)}
          source={pair.client.label}
          destination={pair.server.label}
          sourceException={pair.client.type === clientType ? undefined : toNodeIcon(pair.client.type)}
          destinationException={pair.server.type === serverType ? undefined : toNodeIcon(pair.server.type)}
        />
      ))}
    </div>
  );
};
