import type { MainApiAsync, MenuItem, RuntimeContext } from "../contracts-app";
import type { AppOptions, DetailEvent, FilterEvent, GraphEvent, GraphOptions, Node, ViewGraph } from "../contracts-ui";
import { isEdgeId, NodeType } from "../contracts-ui";
import { bindImage } from "../image";
import { createImageData } from "../presenter";
import { Sql, ViewType } from "../sql2";
import { assert } from "../utils";
import { createViewState, GraphNodes } from "../viewState";
import { getNodeOrThrow, toggleExpanded, writeGraphFilter } from "./viewStateOps";

export const createMainApi = async (sqlTables: Sql.Tables, runtimeContext: RuntimeContext): Promise<MainApiAsync> => {
  const { display, appConfig, setMenuItems } = runtimeContext;

  type MyMenuItem = { label: string; viewType: ViewType };

  const menuItems: MyMenuItem[] = [
    { label: "Assemblies", viewType: "assemblies" },
    { label: "Namespaces", viewType: "namespaces" },
    { label: "References", viewType: "references" },
  ];

  const createImage = bindImage(display.convertPathToUrl);

  const { config } = sqlTables;
  let viewType = config.getViewType() ?? "assemblies";
  let viewState = createViewState(sqlTables, viewType);

  const onMenuItem = (selected: MenuItem): Promise<void> => {
    const myMenuItem = menuItems.find((it) => (it.label = selected.label));
    if (!myMenuItem) throw new Error(`Unexpected label ${selected.label}`);
    viewType = myMenuItem.viewType;
    config.setViewType(viewType);
    setMyMenuItems();
    viewState = createViewState(sqlTables, viewType);
    return showViewType();
  };

  const setMyMenuItems = (): void =>
    setMenuItems(
      menuItems.map((it) => ({ label: it.label, picked: it.viewType == viewType })),
      onMenuItem
    );

  setMyMenuItems();

  let graphNodes: GraphNodes;

  const showViewType = async (): Promise<void> => {
    graphNodes = viewState.getGraphNodes();
    const imageData = createImageData(graphNodes);
    const image = await createImage(imageData);
    const groups: Node[] = graphNodes.forest.roots;
    const viewGraph: ViewGraph = {
      image,
      groups,
      graphFilter: graphNodes.graphFilter,
      graphViewOptions: { graphType: "none" },
    };
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
        // this is a group
        toggleExpanded(id, node.type, graphNodes, viewState);
        await showViewType();
        return;
      }
      // else this is a leaf
      switch (viewType) {
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
      const { /*viewOptions,*/ graphFilter } = filterEvent;
      writeGraphFilter(graphFilter, graphNodes, viewState);
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
