import { AppEvent, AppView, OpenDataSource, PresenterApi } from "../contracts-app";
import type { FilterEvent, GraphEvent, Node } from "../contracts-ui";
import { isClosed, isEdgeId } from "../contracts-ui";
import { renderImage } from "../image";
import { GraphNodes } from "../types";
import { SelectedView } from "./selectedView";

export const createPresenter = async (selectedView: SelectedView): Promise<OpenDataSource> => {
  let graphNodes: GraphNodes;

  // The two views which are not the graph, and which are sent only when they are asked for: the menu items, when
  // the menu has changed, and the options, when they have been edited and so have to be shown back.
  const showMenuItems = (): AppView => ({ type: "menuItems", payload: selectedView.getMenuItems() });
  const showOptions = (): AppView => ({ type: "options", payload: selectedView.options });

  const showViews = async (extraViews: AppView[]): Promise<AppView[]> => {
    graphNodes = selectedView.viewState.getGraphNodes();
    const image = await renderImage(graphNodes.imageData, selectedView.hasParentEdges);

    if (!(typeof image === "string")) image.edgePopups = graphNodes.edgePopups;

    const nodes: Node[] = graphNodes.imageData.roots;
    return [{ type: "nodes", payload: { nodes } }, { type: "image", payload: { image } }, ...extraViews];
  };

  const presenterApi: PresenterApi = async (events: AppEvent[]) => {
    const extraViews: AppView[] = [];

    for (const event of events) {
      switch (event.type) {
        case "graph":
          onGraphEvent(event.payload);
          break;
        case "filter":
          onFilterEvent(event.payload);
          break;
        case "menuItem":
          if (selectedView.onMenuItem(event.payload.menuItemId)) extraViews.push(showMenuItems());
          break;
        case "options":
          selectedView.options = event.payload;
          extraViews.push(showOptions());
          break;
      }
    }

    const result = await showViews(extraViews);
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
  const views = await showViews([showMenuItems(), showOptions()]);
  return { presenterApi, views };
};
