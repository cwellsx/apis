import * as React from "react";
import "./EdgePopup.css";

type EdgePopupProps = { divRef: React.Ref<HTMLDivElement>; edgeId: string | undefined };

// The popup is never unmounted: it is hidden with display instead, so that its ref is always valid and
// Graph can position it imperatively on every mouse move (writing transform, without re-rendering).
// For now it shows only the edge id, which is enough to verify that hover detects the right edge, and
// that the popup is created, destroyed, moved and frozen.
export const EdgePopup: React.FunctionComponent<EdgePopupProps> = (props: EdgePopupProps) => (
  <div className="edge-popup" ref={props.divRef} style={{ display: props.edgeId ? "block" : "none" }}>
    {props.edgeId}
  </div>
);
