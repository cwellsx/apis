import type { AppConfig, MainApiAsync } from "../contracts-app";
import type {
  AppOptions,
  ClusterBy,
  DetailEvent,
  FilterEvent,
  GraphEvent,
  GraphViewOptions,
  ViewOptions,
} from "../contracts-ui";
import {
  isAssemblyNodeId,
  isEdgeId,
  isMethodNodeId,
  MethodNodeId,
  removeNodeId,
  toAnyNodeId,
  toggleNodeId,
} from "../nodeIds";
import { ShowReflected } from "../output";
import type { CommonGraphViewType, SqlLoaded } from "../sql";
import { viewFeatures } from "../utils";
import { showAdjacent } from "./onGraphClick";

export type ShowReflectedEx = ShowReflected & { showMethods: (methodNodeId: MethodNodeId) => Promise<void> };

export const createAppWindow = (sqlLoaded: SqlLoaded, appConfig: AppConfig, show: ShowReflectedEx): MainApiAsync => {
  const setViewOptions = (viewOptions: ViewOptions): void => {
    switch (viewOptions.viewType) {
      case "references":
        sqlLoaded.viewState.referenceViewOptions = viewOptions;
        break;
      case "methods":
        sqlLoaded.viewState.methodViewOptions = viewOptions;
        break;
      case "apis":
        sqlLoaded.viewState.apiViewOptions = viewOptions;
        break;
      case "compiler":
        sqlLoaded.viewState.compilerViewOptions = viewOptions;
        break;
    }
  };

  const getGraphViewOptions = (
    viewType: CommonGraphViewType
  ): { viewOptions: GraphViewOptions; clusterBy: ClusterBy } => {
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

  const getClusterBy = (viewOptions: GraphViewOptions): ClusterBy => {
    switch (viewOptions.viewType) {
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
    onViewOptions: async (viewOptions: ViewOptions): Promise<void> => {
      setViewOptions(viewOptions);
      await show.showViewType();
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
        await show.showViewType();
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
            await show.showViewType();
          } else if (event.ctrlKey) {
            const { clusterBy } = getGraphViewOptions(viewType);
            const graphFilter = sqlLoaded.readGraphFilter(viewType, clusterBy);
            removeNodeId(graphFilter.leafVisible, id);
            sqlLoaded.writeGraphFilter(viewType, clusterBy, graphFilter);
            await show.showViewType();
          } else {
            await show.showAssemblyDetails(assemblyName);
          }
        }
      }
    },

    onFilterEvent: async (filterEvent: FilterEvent): Promise<void> => {
      const { viewOptions, graphFilter } = filterEvent;
      const viewType = viewOptions.viewType;
      if (viewType === "custom") throw new Error("Unexpected viewType");
      const clusterBy = getClusterBy(viewOptions);
      sqlLoaded.writeGraphFilter(viewType, clusterBy, graphFilter);
      await show.showViewType();
    },

    onDetailEvent: async (detailEvent: DetailEvent): Promise<void> => {
      const { id } = detailEvent;
      const nodeId = toAnyNodeId(id);
      if (!isMethodNodeId(nodeId)) return; // user clicked on something other than a method
      // launch in a separate window
      await show.showMethods(nodeId);
    },
    showException: (error: unknown): void => show.showException(error),
  };

  return mainApi;
};
