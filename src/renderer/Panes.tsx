import * as React from "react";
import SplitPane, { SashContent } from "split-pane-react";
import "split-pane-react/esm/themes/default.css";
import "./3rd-party/SplitPane.css";
import "./Panes.css";
import { Input, usePaneSizes } from "./usePaneSizes";

// this encapsulates and is implemented using split-pane-react

type PanesProps = {
  left: React.ReactNode;
  center: React.ReactNode;
  right?: React.ReactNode;
  onWheel: (event: React.WheelEvent) => void;
};

export const Panes: React.FunctionComponent<PanesProps> = (props: PanesProps) => {
  const { left, center, right, onWheel } = props;
  const leftRef = React.useRef<HTMLDivElement>(null);
  const rightRef = React.useRef<HTMLDivElement>(null);

  const initialSize = React.useMemo<Input[]>(() => [[0, leftRef], "*", [0, rightRef]], []);
  const [sizes, setSizes] = usePaneSizes(initialSize);

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
      <div id="group">
        <div ref={leftRef} className="pane-resizes">
          {left}
        </div>
      </div>
      <div id="graph" onWheel={onWheel}>
        {center}
      </div>
      <div id="types">
        <div ref={rightRef} className="pane-resizes">
          {right}
        </div>
      </div>
    </SplitPane>
  );
};
