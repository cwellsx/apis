import type { AppConfig, MainApiAsync, MenuItem, OnMenuItem, SetMenuItems } from "../contracts-app";
import type { AppOptions, FilterEvent, GraphEvent } from "../contracts-ui";
import { edgeIdToNodeIds, GraphOptions, isEdgeId } from "../contracts-ui";
import { toAnyNodeId, toggleNodeId } from "../nodeIds";
import { ShowCustom } from "../output";
import { SqlCustom } from "../sql";
import { assert } from "../utils";

// this is similar to createAppWindow except with an instance of SqlCusom instead of SqlLoaded
export const createCustomWindow = async (
  sqlCustom: SqlCustom,
  appConfig: AppConfig,
  show: ShowCustom,
  setMenuItems: SetMenuItems
): Promise<MainApiAsync> => {
  type ViewMenuItem = { menuLabel: string; title: string; showViewType: () => Promise<void> };
  const viewMenuItem: ViewMenuItem = {
    menuLabel: "Custom JSON",
    title: `Custom JSON`,
    showViewType: show.showGraphCustom,
  };

  const onMenuItem: OnMenuItem = async (selected: MenuItem): Promise<void> => {
    assert(selected.label == viewMenuItem.menuLabel);
    await showViewType();
  };

  setMenuItems([{ label: viewMenuItem.menuLabel, picked: true }], onMenuItem);
  const showViewType = async (): Promise<void> => viewMenuItem.showViewType();
  await showViewType();

  const setCustomViewOptions = (viewOptions: GraphOptions.Any): void => {
    switch (viewOptions.graphType) {
      case "custom":
        sqlCustom.viewState.customViewOptions = viewOptions;
        break;
      default:
        throw new Error("Unexpected options type");
    }
  };

  // implement the MainApiAsync which will be bound to ipcMain
  const mainApi: MainApiAsync = {
    onViewOptions: async (viewOptions: GraphOptions.Any): Promise<void> => {
      setCustomViewOptions(viewOptions);
      await showViewType();
    },
    onAppOptions: async (appOptions: AppOptions): Promise<void> => {
      appConfig.appOptions = appOptions;
      await show.showAppOptions(appOptions);
    },
    onGraphEvent: async (graphEvent: GraphEvent): Promise<void> => {
      const { id } = graphEvent;
      if (isEdgeId(id)) {
        const { serverId } = edgeIdToNodeIds(id);
        await show.showCustomdDetails(serverId);
        return;
      }
      const nodeId = toAnyNodeId(id);
      if ("customLeaf" !== nodeId.type) {
        // this is a group
        const viewOptions = sqlCustom.viewState.customViewOptions;
        const clusterBy = GraphOptions.isCustomManual(viewOptions) ? viewOptions.clusterBy : undefined;
        const graphFilter = sqlCustom.readGraphFilter(clusterBy);
        toggleNodeId(graphFilter.groupExpanded, id);
        sqlCustom.writeGraphFilter(clusterBy, graphFilter);
        setCustomViewOptions(viewOptions);
        await showViewType();
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
      await showViewType();
    },
    onDetailEvent: (/* detailEvent */): Promise<void> => {
      throw Error("Not implemented");
    },
    showException: (error: unknown): void => show.showException(error),
  };

  return mainApi;
};
