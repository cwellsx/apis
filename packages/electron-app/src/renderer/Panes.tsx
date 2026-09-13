import * as React from "react";
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
  appOptions: React.ReactNode;
  fontSize: number;
  onWheelZoomPercent: OnWheel;
  onWheelFontSize: OnWheel;
  rightWidthMaxContent: boolean;
};

export const Panes: React.FunctionComponent<PanesProps> = (props: PanesProps) => {
  const { left, center, right, fontSize, appOptions, onWheelZoomPercent, onWheelFontSize, rightWidthMaxContent } =
    props;
  // const leftRef = React.useRef<HTMLDivElement>(null);
  // const rightRef = React.useRef<HTMLDivElement>(null);

  // // https://react.dev/reference/react/memo#troubleshooting says at the end,
  // // "To avoid this, simplify props or memoize props in the parent component."
  // const initialSize = React.useMemo<Input[]>(() => [[0, leftRef], "*", [0, rightRef]], []);

  const initialSize: Input[] = [30, "*", 20];
  const [sizes, setSizes, resetSizes] = usePaneSizes(initialSize, 16);

  const style = { fontSize: fontSize };

  if (!rightWidthMaxContent && right && !sizes[2]) resetSizes([sizes[0], "*", 400]);

  return (
    <>
      {" "}
      <div id="group" onWheel={onWheelFontSize} style={style}>
        <div className="pane-resizes">
          {left}
          <div className="bottom">{appOptions}</div>
          <div className="zoom">{`${fontSize}px`}</div>
        </div>
      </div>
      <div id="graph" onWheel={onWheelZoomPercent}>
        {center}
      </div>
      <div id="types" onWheel={onWheelFontSize} style={style}>
        <div className={rightWidthMaxContent ? "pane-resizes" : undefined}>{right}</div>
      </div>
    </>
  );

  // return (
  //   <SplitPane
  //     split="vertical"
  //     sizes={sizes}
  //     onChange={setSizes}

  //     sashRender={(_, active) => <SashContent active={active} type="vscode"></SashContent>}
  //   >
  //     <div id="group" onWheel={onWheelFontSize} style={style}>
  //       <div className="pane-resizes">
  //         {left}
  //         <div className="bottom">{appOptions}</div>
  //         <div className="zoom">{`${fontSize}px`}</div>
  //       </div>
  //     </div>
  //     <div id="graph" onWheel={onWheelZoomPercent}>
  //       {center}
  //     </div>
  //     <div id="types" onWheel={onWheelFontSize} style={style}>
  //       <div className={rightWidthMaxContent ? "pane-resizes" : undefined}>{right}</div>
  //     </div>
  //   </SplitPane>
  // );
};
