import * as Flex from "flexlayout-react";
import "flexlayout-react/style/underline.css";
import * as React from "react";
import "./Layout.scss";
import { getScrollbarWidth } from "./scrollbarWidth";

// Flex API described at https://github.com/caplin/FlexLayout and e.g. https://caplin.github.io/FlexLayout/demos/v0.11/examples/basic/

// defines the layout
const jsonModel: Flex.IJsonModel = {
  global: { tabEnableClose: false },
  layout: {
    // one row with chilfren
    type: "row",
    children: [
      {
        // necessarily a "tabset" -- type can have no other value here
        type: "tabset",
        id: "tsExplorer",
        weight: 50,
        children: [
          { type: "tab", id: "tExplorer", name: "Explorer", component: "explorer" },
          { type: "tab", id: "tOptions", name: "Options", component: "options" },
        ],
      },
      {
        type: "tabset",
        id: "tsGraph",
        weight: 50,
        children: [{ type: "tab", id: "tGraph", name: "Graph", component: "graph" }],
      },
    ],
  },
};

const model: Flex.Model = Flex.Model.fromJson(jsonModel);

const scrollbarWidth = getScrollbarWidth();

const isDebugging = true;

// outside the component, so that it is the same value on every render: the effect below uses it, and making it
// a dependency of that effect would be wrong while it were a new function each time
const debugLog = (s: string) => {
  if (isDebugging) console.log(s);
};

type LayoutProps = {
  left: React.ReactNode;
  center: React.ReactNode;
  right?: React.ReactNode;
  appOptions: React.ReactNode;
  viewVersion: number;
};

export const Layout: React.FunctionComponent<LayoutProps> = (props: LayoutProps) => {
  const { left, center, right, appOptions, viewVersion } = props;

  const layoutContainerRef = React.useRef<HTMLDivElement>(null);

  debugLog(`viewVersion ${viewVersion}`);

  React.useEffect(() => {
    debugLog(`useEffect`);
    // This executes EXACTLY once per backend tree update cycle
    const timer = setTimeout(() => {
      debugLog(`on Timeout`);
      // Only the selected tab of a tabset is laid out, so with the Options tab on display the Explorer's tree
      // is either absent or measured as nothing. Snapping to that would resize the panes under whatever is
      // being looked at, so the snap happens only while the Explorer tab is the one being displayed.
      const tabset = model.getNodeById("tsExplorer");
      const selectedTab = tabset instanceof Flex.TabSetNode ? tabset.getSelectedNode() : undefined;
      if (selectedTab?.getId() !== "tExplorer") {
        debugLog(`!explorerTab`);
        return;
      }

      const layoutEl = layoutContainerRef.current;
      if (!layoutEl) {
        debugLog(`!layoutEl`);
        return;
      }

      // Scrape the DOM safely after FlexLayout finishes printing the tabs
      const treeContent = layoutEl.querySelector("#explorer");
      if (!treeContent) {
        debugLog(`!treeContent`);
        return;
      }

      // A collapsed tabset still has a selected tab, but nothing to measure
      const treeWidth = treeContent.getBoundingClientRect().width;
      if (treeWidth <= 0) {
        debugLog(`!treeWidth`);
        return;
      }

      const neededWidth = treeWidth + scrollbarWidth;

      const totalWidth = layoutEl.getBoundingClientRect().width;

      if (totalWidth <= 0) {
        debugLog(`!totalWidth`);
        return;
      }

      debugLog(`needed ${neededWidth} total ${totalWidth}`);

      const calculatedWeight = (neededWidth / totalWidth) * 100;
      debugLog(`calculatedWeight ${calculatedWeight}`);

      // Snap the panel, then clear boundaries so manual resizing works
      model.doAction(
        Flex.Actions.updateNodeAttributes("tsExplorer", {
          weight: calculatedWeight,
          minWidth: undefined,
          maxWidth: undefined,
        })
      );
      model.doAction(
        Flex.Actions.updateNodeAttributes("tsGraph", {
          weight: 100 - calculatedWeight,
          minWidth: undefined,
          maxWidth: undefined,
        })
      );
    }, 50); // Safe breathing room for internal layout calculations

    return () => clearTimeout(timer); // Prevent memory issues if viewVersion changes rapidly
  }, [viewVersion]);

  const factory: (node: Flex.TabNode) => React.ReactNode = (node) => {
    switch (node.getComponent()) {
      case "explorer":
        return left;
      case "options":
        return appOptions;
      case "graph":
        return center;
    }
    return undefined;
  };

  return (
    <div ref={layoutContainerRef} style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <Flex.Layout model={model} factory={factory} />
    </div>
  );
};
