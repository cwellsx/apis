import type { AppConfig, MainApiAsync } from "../contracts-app";
import type { AppOptions, FilterEvent, GraphEvent, ViewType } from "../contracts-ui";
import { edgeIdToNodeIds, GraphOptions, isEdgeId } from "../contracts-ui";
import { toAnyNodeId, toggleNodeId } from "../nodeIds";
import { ShowCustom } from "../output";
import { SqlCustom } from "../sql";
import { viewFeatures } from "../utils";

// this is similar to createAppWindow except with an instance of SqlCusom instead of SqlLoaded
export const createCustomWindow = (sqlCustom: SqlCustom, appConfig: AppConfig, show: ShowCustom): MainApiAsync => {
  const setCustomViewOptions = (viewOptions: GraphOptions.Any): void => {
    switch (viewOptions.graphType) {
      case "custom":
        sqlCustom.viewState.customViewOptions = viewOptions;
        break;
      default:
        throw new Error("Unexpected options type");
    }
  };

  const getCustomViewOptions = (viewType: ViewType): GraphOptions.Custom => {
    switch (viewType) {
      case "custom":
        return sqlCustom.viewState.customViewOptions;
      default:
        throw new Error("Unexpected options type");
    }
  };

  // implement the MainApiAsync which will be bound to ipcMain
  const mainApi: MainApiAsync = {
    onViewOptions: async (viewOptions: GraphOptions.Any): Promise<void> => {
      setCustomViewOptions(viewOptions);
      await show.showViewType();
    },
    onAppOptions: async (appOptions: AppOptions): Promise<void> => {
      appConfig.appOptions = appOptions;
      await show.showAppOptions(appOptions);
    },
    onGraphEvent: async (graphEvent: GraphEvent): Promise<void> => {
      const { id, viewType } = graphEvent;
      const { leafType } = viewFeatures[viewType];
      if (isEdgeId(id)) {
        const { serverId } = edgeIdToNodeIds(id);
        await show.showCustomdDetails(serverId);
        return;
      }
      const nodeId = toAnyNodeId(id);
      if (leafType !== nodeId.type) {
        // this is a group
        const viewOptions = getCustomViewOptions(viewType);
        const clusterBy = GraphOptions.isCustomManual(viewOptions) ? viewOptions.clusterBy : undefined;
        const graphFilter = sqlCustom.readGraphFilter(clusterBy);
        toggleNodeId(graphFilter.groupExpanded, id);
        sqlCustom.writeGraphFilter(clusterBy, graphFilter);
        setCustomViewOptions(viewOptions);
        await show.showViewType();
        return;
      } else {
        // else this is a leaf
        await show.showCustomdDetails(id);
      }
      return;
    },
    onFilterEvent: async (filterEvent: FilterEvent): Promise<void> => {
      const { viewOptions, graphFilter } = filterEvent;
      if (!GraphOptions.isCustom(viewOptions)) throw new Error("Unexpected viewType");
      const clusterBy = GraphOptions.isCustomManual(viewOptions) ? viewOptions.clusterBy : undefined;
      sqlCustom.writeGraphFilter(clusterBy, graphFilter);
      await show.showViewType();
    },
    onDetailEvent: (/* detailEvent */): Promise<void> => {
      throw Error("Not implemented");
    },
    showException: (error: unknown): void => show.showException(error),
  };

  return mainApi;
};
