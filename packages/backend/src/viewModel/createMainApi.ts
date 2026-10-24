import type { MainApiAsync, RuntimeContext } from "../contracts-app";
import type { AppOptions, DetailEvent, FilterEvent, GraphEvent, GraphOptions, Node, ViewGraph } from "../contracts-ui";
import { isClosed, isEdgeId } from "../contracts-ui";
import { bindImage } from "../image";
import { assert } from "../utils";
import { GraphNodes } from "../viewState";
import { createImageData } from "./createImageData";
import { SelectedView } from "./selectedView";

export const createMainApi = async (
  selectedView: SelectedView,
  runtimeContext: RuntimeContext
): Promise<MainApiAsync> => {
  const { display, appConfig } = runtimeContext;
  const createImage = bindImage(display.convertPathToUrl);

  let graphNodes: GraphNodes;

  const showViewType = async (): Promise<void> => {
    graphNodes = selectedView.viewState.getGraphNodes();
    const imageData = createImageData(graphNodes);
    const image = await createImage(imageData);
    const groups: Node[] = graphNodes.roots;
    const viewGraph: ViewGraph = { image, groups, graphViewOptions: { graphType: "none" }, isCheckModelAll: false };
    display.showView(viewGraph);
  };

  selectedView.onChanged = showViewType;

  await showViewType();

  const notImplemented = () => assert(false, "Not implemented");

  // implement the MainApiAsync which will be bound to ipcMain
  const mainApi: MainApiAsync = {
    onViewOptions: async (viewOptions: GraphOptions.Any): Promise<void> => {
      notImplemented(); // setViewOptions(viewOptions);
      await showViewType();
    },

    onAppOptions: async (appOptions: AppOptions): Promise<void> => {
      appConfig.appOptions = appOptions;
      display.showAppOptions(appOptions);
      return Promise.resolve();
    },

    onGraphEvent: async (graphEvent: GraphEvent): Promise<void> => {
      const { id /*, event*/ } = graphEvent;
      if (isEdgeId(id)) {
        throw new Error("Edge details not yet implemented");
      }
      // else it's a node not an edge
      const node = graphNodes.getNode(id);
      if (graphNodes.leafType !== node.type) {
        // this is a group -- toggle expanded -- if it was closed then it's now expanded or vice versa
        selectedView.viewState.setNodeState(id, node.type, { isExpanded: isClosed(node) }, graphNodes);
        await showViewType();
        return;
      }
      // else this is a leaf
      throw new Error("showMDetails is not yet implemented");
    },

    onFilterEvent: async (filterEvent: FilterEvent): Promise<void> => {
      filterEvent.forEach((newNodeState) => {
        const { id, nodeType, nodeState } = newNodeState;
        selectedView.viewState.setNodeState(id, nodeType, nodeState, graphNodes);
      });
      // const { /*viewOptions,*/ graphFilter } = filterEvent;
      // writeGraphFilter(graphFilter, graphNodes, viewState);
      await showViewType();
    },

    onDetailEvent: async (detailEvent: DetailEvent): Promise<void> => {
      const { id } = detailEvent;
      throw new Error("showMethods is not yet implemented");
    },
    showException: (error: unknown): void => display.showException(error),
  };

  return mainApi;
};
