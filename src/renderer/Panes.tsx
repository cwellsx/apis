import * as React from "react";
import SplitPane, { SashContent } from "split-pane-react";
import "split-pane-react/esm/themes/default.css";
import "./3rd-party/SplitPane.css";
import "./Panes.css";
import { Input, usePaneSizes } from "./usePaneSizes";
import { OnWheel } from "./useZoomPercent";

// this encapsulates and is implemented using split-pane-react

type PanesProps = {
  left: React.ReactNode;
  center: React.ReactNode;
  right?: React.ReactNode;
  fontSize: number;
  onWheelZoomPercent: OnWheel;
  onWheelFontSize: OnWheel;
  rightWidthMaxContent: boolean;
};

export const Panes: React.FunctionComponent<PanesProps> = (props: PanesProps) => {
  const { left, center, right, fontSize, onWheelZoomPercent, onWheelFontSize, rightWidthMaxContent } = props;
  const leftRef = React.useRef<HTMLDivElement>(null);
  const rightRef = React.useRef<HTMLDivElement>(null);

  // https://react.dev/reference/react/memo#troubleshooting says at the end,
  // "To avoid this, simplify props or memoize props in the parent component."
  const initialSize = React.useMemo<Input[]>(() => [[0, leftRef], "*", [0, rightRef]], []);
  const [sizes, setSizes, resetSizes] = usePaneSizes(initialSize, 16);

  const style = { fontSize: fontSize };

  if (!rightWidthMaxContent && right && !sizes[2]) resetSizes([sizes[0], "*", 400]);

  return (
    <SplitPane
      split="vertical"
      sizes={sizes}
      onChange={setSizes}
      // I like the "line" theme but it doesn't work in TypeScript
      // https://github.com/yyllff/split-pane-react/issues/16
      //
      // instead observe that the line is implemented by this ...
      //
      //     <div class="split-sash-content split-sash-content-vscode"></div>
      //
      // ... which changes to this when the cursor is hovering on it or dragging it ...
      //
      //     <div class="split-sash-content split-sash-content-active split-sash-content-vscode"></div>
      sashRender={(_, active) => <SashContent active={active} type="vscode"></SashContent>}
    >
      <div id="group" onWheel={onWheelFontSize} style={style}>
        <div ref={leftRef} className="pane-resizes">
          {left}
          <span className="zoom">{`${fontSize}px`}</span>
        </div>
      </div>
      <div id="graph" onWheel={onWheelZoomPercent}>
        {center}
      </div>
      <div id="types" onWheel={onWheelFontSize} style={style}>
        <div ref={rightRef} className={rightWidthMaxContent ? "pane-resizes" : undefined}>
          {right}
        </div>
      </div>
    </SplitPane>
  );
};
