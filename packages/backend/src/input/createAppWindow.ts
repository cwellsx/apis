import type { AppConfig, MainApiAsync, MenuItem, OnMenuItem, SetMenuItems } from "../contracts-app";
import type {
  AppOptions,
  ClusterBy,
  CommonGraphType,
  DetailEvent,
  FilterEvent,
  GraphEvent,
  GraphOptions,
  ViewType,
} from "../contracts-ui";
import { isEdgeId } from "../contracts-ui";
import { isAssemblyNodeId, isMethodNodeId, MethodNodeId, removeNodeId, toAnyNodeId, toggleNodeId } from "../nodeIds";
import { ShowMethod, ShowReflected } from "../output";
import type { SqlLoaded } from "../sql";
import { viewFeatures } from "../utils";
import { showAdjacent } from "./onGraphClick";

type ViewMenuItem = { viewType: ViewType; menuLabel: string; title: string; showViewType: () => Promise<void> };

export const createAppWindow = async (
  sqlLoaded: SqlLoaded,
  appConfig: AppConfig,
  show: ShowReflected,
  setMenuItems: SetMenuItems,
  showMethod: ShowMethod,
  methodNodeId: MethodNodeId | undefined
): Promise<MainApiAsync> => {
  const viewMenuItems: ViewMenuItem[] = [
    { viewType: "references", menuLabel: "Assemblies", title: "References", showViewType: show.showReferences },
    { viewType: "apis", menuLabel: "APIs", title: "APIs", showViewType: show.showApis },
  ];

  if (methodNodeId)
    viewMenuItems.push({
      viewType: "methods",
      menuLabel: "Callstack",
      title: "Callstack",
      showViewType: () => showMethod(methodNodeId),
    });

  const onMenuItem: OnMenuItem = async (selected: MenuItem): Promise<void> => {
    viewMenuItem = viewMenuItems.find((v) => v.menuLabel == selected.label)!;
    showMenuItems();
    await showViewType();
  };

  // initialize menu
  const initViewType: ViewType = methodNodeId ? "methods" : sqlLoaded.viewState.viewType;
  let viewMenuItem = viewMenuItems.find((v) => v.viewType == initViewType)!;
  const showViewType = async (): Promise<void> => viewMenuItem.showViewType();
  const showMenuItems = () => {
    setMenuItems(
      viewMenuItems.map((v) => ({ label: v.menuLabel, picked: v == viewMenuItem })),
      onMenuItem
    );
    show.showTitle(viewMenuItem.title);
  };
  showMenuItems();
  await showViewType();

  const setViewOptions = (viewOptions: GraphOptions.Any): void => {
    switch (viewOptions.graphType) {
      case "references":
        sqlLoaded.viewState.referenceViewOptions = viewOptions;
        break;
      case "methods":
        sqlLoaded.viewState.methodViewOptions = viewOptions;
        break;
      case "apis":
        sqlLoaded.viewState.apiViewOptions = viewOptions;
        break;
    }
  };

  const getGraphViewOptions = (viewType: CommonGraphType): { viewOptions: GraphOptions.Any; clusterBy: ClusterBy } => {
    switch (viewType) {
      case "references": {
        const viewOptions = sqlLoaded.viewState.referenceViewOptions;
        return { viewOptions, clusterBy: "assembly" };
      }
      case "methods": {
        const viewOptions = sqlLoaded.viewState.methodViewOptions;
        return { viewOptions, clusterBy: viewOptions.showClustered.clusterBy };
      }
      case "apis": {
        const viewOptions = sqlLoaded.viewState.apiViewOptions;
        return { viewOptions, clusterBy: viewOptions.showClustered.clusterBy };
      }
    }
  };

  const getClusterBy = (viewOptions: GraphOptions.Any): ClusterBy => {
    switch (viewOptions.graphType) {
      case "references":
        return "assembly";

      case "methods":
      case "apis":
        return viewOptions.showClustered.clusterBy;
      case "custom":
        throw new Error("Unexpected viewType");
    }
  };

  // implement the MainApiAsync which will be bound to ipcMain
  const mainApi: MainApiAsync = {
    onViewOptions: async (viewOptions: GraphOptions.Any): Promise<void> => {
      setViewOptions(viewOptions);
      await showViewType();
    },

    onAppOptions: async (appOptions: AppOptions): Promise<void> => {
      appConfig.appOptions = appOptions;
      await show.showAppOptions(appOptions);
    },

    onGraphEvent: async (graphEvent: GraphEvent): Promise<void> => {
      const { id, viewType, event } = graphEvent;
      if (viewType === "custom") throw new Error("Unexpected viewType");
      const { leafType, details } = viewFeatures[viewType];
      if (isEdgeId(id)) {
        if (!details.includes("edge")) return;
        throw new Error("Edge details not yet implemented");
      }
      // else it's a node not an edge
      const nodeId = toAnyNodeId(id);
      if (leafType !== nodeId.type) {
        // this is a group
        const { clusterBy } = getGraphViewOptions(viewType);
        const graphFilter = sqlLoaded.readGraphFilter(viewType, clusterBy);
        toggleNodeId(graphFilter.groupExpanded, id);
        sqlLoaded.writeGraphFilter(viewType, clusterBy, graphFilter);
        await showViewType();
        return;
      }
      // else this is a leaf
      switch (viewType) {
        case "apis":
        case "methods": {
          if (!isMethodNodeId(nodeId)) throw new Error("Expected method id");
          await show.showMethodDetails(nodeId);
          return;
        }
        case "references": {
          if (!isAssemblyNodeId(nodeId)) throw new Error("Expected assembly id");
          const { name: assemblyName } = nodeId;
          const assemblyReferences = sqlLoaded.readAssemblyReferences();
          if (event.shiftKey) {
            const { clusterBy } = getGraphViewOptions(viewType);
            const graphFilter = sqlLoaded.readGraphFilter(viewType, clusterBy);
            showAdjacent(assemblyReferences, graphFilter, assemblyName);
            sqlLoaded.writeGraphFilter(viewType, clusterBy, graphFilter);
            await showViewType();
          } else if (event.ctrlKey) {
            const { clusterBy } = getGraphViewOptions(viewType);
            const graphFilter = sqlLoaded.readGraphFilter(viewType, clusterBy);
            removeNodeId(graphFilter.leafVisible, id);
            sqlLoaded.writeGraphFilter(viewType, clusterBy, graphFilter);
            await showViewType();
          } else {
            await show.showAssemblyDetails(assemblyName);
          }
        }
      }
    },

    onFilterEvent: async (filterEvent: FilterEvent): Promise<void> => {
      const { viewOptions, graphFilter } = filterEvent;
      const viewType = viewOptions.graphType;
      if (viewType === "custom") throw new Error("Unexpected viewType");
      const clusterBy = getClusterBy(viewOptions);
      sqlLoaded.writeGraphFilter(viewType, clusterBy, graphFilter);
      await showViewType();
    },

    onDetailEvent: async (detailEvent: DetailEvent): Promise<void> => {
      const { id } = detailEvent;
      const nodeId = toAnyNodeId(id);
      if (!isMethodNodeId(nodeId)) return; // user clicked on something other than a method
      // launch in a separate window
      await showMethod(nodeId);
    },

    showException: (error: unknown): void => show.showException(error),
  };

  return mainApi;
};
