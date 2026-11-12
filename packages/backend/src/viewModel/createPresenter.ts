import { AppEvent, AppView, OpenDataSource, PresenterApi } from "../contracts-app";
import type { FilterEvent, GraphEvent, Node } from "../contracts-ui";
import { isClosed, isEdgeId } from "../contracts-ui";
import { renderImage } from "../image";
import { GraphNodes } from "../types";
import { SelectedView } from "./selectedView";

// The types of view, of which showViews is asked to add the ones which are not the graph: the menu items, when the
// menu has changed, and the options, when they have been edited and so have to be shown back. Derived from AppView,
// so that a view type added to the contract does not mean editing a list here.
type AppViewType = AppView["type"];

export const createPresenter = async (selectedView: SelectedView): Promise<OpenDataSource> => {
  let graphNodes: GraphNodes;

  const showViews = async (appViewTypes?: AppViewType[]): Promise<AppView[]> => {
    graphNodes = selectedView.viewState.getGraphNodes();
    const image = await renderImage(graphNodes.imageData, selectedView.hasParentEdges);

    if (!(typeof image === "string")) image.edgePopups = graphNodes.edgePopups;

    const nodes: Node[] = graphNodes.imageData.roots;
    const views: AppView[] = [
      { type: "nodes", payload: { nodes } },
      { type: "image", payload: { image } },
    ];
    if (appViewTypes?.includes("menuItems")) {
      const menuItems = selectedView.getMenuItems();
      views.push({ type: "menuItems", payload: menuItems });
    }
    if (appViewTypes?.includes("options")) {
      views.push({ type: "options", payload: selectedView.options });
    }
    return views;
  };

  const presenterApi: PresenterApi = async (events: AppEvent[]) => {
    const appViewTypes: AppViewType[] = [];

    for (const event of events) {
      switch (event.type) {
        case "graph":
          onGraphEvent(event.payload);
          break;
        case "filter":
          onFilterEvent(event.payload);
          break;
        case "menuItem":
          if (selectedView.onMenuItem(event.payload.menuItemId)) appViewTypes.push("menuItems");
          break;
        case "options":
          selectedView.options = event.payload;
          appViewTypes.push("options");
          break;
      }
    }

    const result = await showViews(appViewTypes);
    return result;
  };

  const onGraphEvent = (graphEvent: GraphEvent): void => {
    const { id /*, event*/ } = graphEvent;
    if (isEdgeId(id)) {
      throw new Error("Edge details not yet implemented");
    }
    // else it's a node not an edge
    const node = graphNodes.getNode(id);
    if (graphNodes.leafType !== node.type) {
      // this is a group -- toggle expanded -- if it was closed then it's now expanded or vice versa
      selectedView.viewState.setNodeState(id, node.type, { isExpanded: isClosed(node) }, graphNodes);
      return;
    }
    // else this is a leaf
    throw new Error("showMDetails is not yet implemented");
  };

  const onFilterEvent = (filterEvent: FilterEvent): void => {
    filterEvent.forEach((newNodeState) => {
      const { id, nodeType, nodeState } = newNodeState;
      selectedView.viewState.setNodeState(id, nodeType, nodeState, graphNodes);
    });
  };

  // the start-up sends the menu, and the options so that the panel can show them
  const views = await showViews(["menuItems", "options"]);
  return { presenterApi, views };
};
