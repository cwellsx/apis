import "split-pane-react/esm/themes/default.css";
import "./Panes.css";
import * as React from "react";
import SplitPane, { SashContent } from "split-pane-react";

// this encapsulates and is implemented using split-pane-react

type PanesProps = {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
};

export const Panes: React.FunctionComponent<PanesProps> = (props: PanesProps) => {
  const [sizes, setSizes] = React.useState<(string | number)[]>(["15%", "70%", "15%"]);

  const { left, center, right } = props;

  const layoutCSS = {
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

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

  return (
    <SplitPane
      split="vertical"
      sizes={sizes}
      onChange={setSizes}
      sashRender={(_, active) => <SashContent active={active} type="vscode"></SashContent>}
    >
      <div style={{ ...layoutCSS }}>{left}</div>
      <div id="graph" style={{ ...layoutCSS }}>
        {center}
      </div>
      <div style={{ ...layoutCSS }}>{right}</div>
    </SplitPane>
  );
};
