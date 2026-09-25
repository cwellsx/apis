import type { MainApiAsync, MenuItem, RuntimeContext } from "../contracts-app";
import type { AppOptions, DetailEvent, FilterEvent, GraphEvent, GraphOptions, Node, ViewGraph } from "../contracts-ui";
import { isEdgeId, NodeType } from "../contracts-ui";
import { bindImage } from "../image";
import { createImageData } from "../presenter";
import { Sql, ViewType } from "../sql2";
import { assert } from "../utils";
import { createViewState, getNodeState, GraphNodes, NodeState } from "../viewState";
import { getNodeOrThrow } from "./viewStateOps";

export const createMainApi = async (sqlTables: Sql.Tables, runtimeContext: RuntimeContext): Promise<MainApiAsync> => {
  const { display, appConfig, setMenuItems } = runtimeContext;
  const { config } = sqlTables;
  const createImage = bindImage(display.convertPathToUrl);

  let viewState = createViewState(sqlTables, config.getViewType() ?? "assemblies");

  const createMenuItems = (): void => {
    const onSetViewType = (viewType: ViewType): Promise<void> => {
      config.setViewType(viewType);
      viewState = createViewState(sqlTables, viewType);
      createMenuItems();
      return showViewType();
    };

    const onReset = (): Promise<void> => {
      viewState.resetNodeStates();
      return showViewType();
    };

    const getSetViewType = (label: string, viewType: ViewType): MenuItem => ({
      type: "radio",
      label,
      picked: viewType == viewState.viewType,
      onClick: () => onSetViewType(viewType),
    });

    setMenuItems([
      getSetViewType("Assemblies", "assemblies"),
      getSetViewType("Namespaces", "namespaces"),
      getSetViewType("References", "references"),
      { type: "separator" },
      { type: "separator" },
      { type: "normal", label: "Reset", onClick: onReset },
    ]);
  };

  createMenuItems();

  let graphNodes: GraphNodes;

  const showViewType = async (): Promise<void> => {
    graphNodes = viewState.getGraphNodes();
    const imageData = createImageData(graphNodes);
    const image = await createImage(imageData);
    const groups: Node[] = graphNodes.forest.roots;
    const viewGraph: ViewGraph = { image, groups, graphViewOptions: { graphType: "none" }, isCheckModelAll: false };
    display.showView(viewGraph);
  };

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
      const node = getNodeOrThrow(id, graphNodes);
      if (graphNodes.leafType !== node.type) {
        // this is a group -- toggle expanded
        const nodeState = getNodeState(node);
        nodeState.isExpanded = !nodeState.isExpanded;
        viewState.setNodeState(id, node.type, nodeState);
        await showViewType();
        return;
      }
      // else this is a leaf
      switch (viewState.viewType) {
        case "assemblies":
        case "namespaces": {
          assert(node.type == NodeType.Method);
          throw new Error("showMethodDetails is not yet implemented");
        }
        case "references": {
          assert(node.type == NodeType.Assembly);
          // and/or use event.shiftKey to showAdjacent()
          // and/or use event.ctrlKey to hide this node
          throw new Error("showAssemblyDetails is not yet implemented");
        }
      }
    },

    onFilterEvent: async (filterEvent: FilterEvent): Promise<void> => {
      filterEvent.forEach((newNodeState) => {
        const { id, nodeType, isShown, collapsible } = newNodeState;
        const nodeState: NodeState = { isHidden: !isShown, isExpanded: collapsible == "expanded" };
        viewState.setNodeState(id, nodeType, nodeState);
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
