import * as Flex from "flexlayout-react";
import "flexlayout-react/style/underline.css";
import * as React from "react";

// Flex API described at https://github.com/caplin/FlexLayout and e.g. https://caplin.github.io/FlexLayout/demos/v0.11/examples/basic/

// defines the layout
const jsonModel: Flex.IJsonModel = {
  global: {},
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

type LayoutProps = {
  left: React.ReactNode;
  center: React.ReactNode;
  right?: React.ReactNode;
  appOptions: React.ReactNode;
};

export const Layout: React.FunctionComponent<LayoutProps> = (props: LayoutProps) => {
  const { left, center, right, appOptions } = props;

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
  return <Flex.Layout model={model} factory={factory} />;
};
