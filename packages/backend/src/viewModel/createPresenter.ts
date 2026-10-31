import { AppEvent, AppView, OpenDataSource, PresenterApi } from "../contracts-app";
import type { FilterEvent, GraphEvent, Node } from "../contracts-ui";
import { isClosed, isEdgeId } from "../contracts-ui";
import { createImage } from "../image";
import { GraphNodes } from "../viewState";
import { createImageData } from "./createImageData";
import { SelectedView } from "./selectedView";

export const createPresenter = async (selectedView: SelectedView): Promise<OpenDataSource> => {
  let graphNodes: GraphNodes;

  const showViews = async (needMenuItems: boolean): Promise<AppView[]> => {
    graphNodes = selectedView.viewState.getGraphNodes();
    const imageData = createImageData(graphNodes);
    const image = await createImage(imageData);
    const nodes: Node[] = graphNodes.roots;
    const views: AppView[] = [
      { type: "nodes", payload: { nodes } },
      { type: "image", payload: { image } },
    ];
    if (needMenuItems) {
      const menuItems = selectedView.getMenuItems();
      views.push({ type: "menuItems", payload: menuItems });
    }
    return views;
  };

  const presenterApi: PresenterApi = async (events: AppEvent[]) => {
    let needMenuItems = false;

    for (const event of events) {
      switch (event.type) {
        case "graph":
          onGraphEvent(event.payload);
          break;
        case "filter":
          onFilterEvent(event.payload);
          break;
        case "menuItem":
          needMenuItems ||= selectedView.onMenuItem(event.payload.menuItemId);
          break;
      }
    }

    const result = await showViews(needMenuItems);
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

  const views = await showViews(true);
  return { presenterApi, views };
};
