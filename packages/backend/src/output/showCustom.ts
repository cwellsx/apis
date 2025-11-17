import { AppConfig, DisplayApi } from "../contracts-app";
import { AppOptions, DetailedCustom, isCustomManual, NodeId, ViewCustomErrors } from "../contracts-ui";
import { anyNodeIdToText, isNameNodeId, toAnyNodeId } from "../nodeIds";
import { SqlCustom } from "../sql";
import { convertLoadedToCustom } from "./helpers";
import { bindImage } from "./image";
import { KVP, showMenu } from "./showMenu";
import { Show, ShowCustom } from "./types";

export const showCustom = (
  display: DisplayApi,
  sqlCustom: SqlCustom,
  appConfig: AppConfig,
  dataSourcePath: string
): Show<ShowCustom> => {
  const createViewGraph = bindImage(display.convertPathToUrl);

  const showCustom = async (): Promise<void> => {
    const nodes = sqlCustom.readAll();
    const viewOptions = sqlCustom.viewState.customViewOptions;
    const clusterBy = isCustomManual(viewOptions) ? viewOptions.clusterBy : undefined;
    const graphFilter = sqlCustom.readGraphFilter(clusterBy);
    const graphData = convertLoadedToCustom(nodes, viewOptions, graphFilter);
    const viewGraph = await createViewGraph(graphData);
    display.showView(viewGraph);
  };

  const showErrors = (): Promise<void> => {
    const customErrors = sqlCustom.readErrors();

    const viewErrors: ViewCustomErrors = { customErrors, viewType: "customErrors" };
    display.showView(viewErrors);
    return Promise.resolve();
  };

  const showCustomdDetails = (id: NodeId): Promise<void> => {
    const nodeId = toAnyNodeId(id);
    if (!isNameNodeId(nodeId)) throw new Error("Expected nameNodeId");
    // get all the nodes
    // they're all stored as one string in SQL so there's no API to get just one node
    const nodes = sqlCustom.readAll();
    const node = nodes.find((node) => node.id === nodeId.name);
    if (!node) throw new Error(`Node not found: ${anyNodeIdToText(nodeId)}`);
    const viewDetails: DetailedCustom = {
      id: node.id,
      layer: node.layer ?? "",
      details: node.details ?? [],
      detailType: "customDetails",
    };
    display.showDetails(viewDetails);
    return Promise.resolve();
  };

  const kvps: KVP[] = [
    [
      "custom",
      //
      { menuLabel: "Custom JSON", title: `${dataSourcePath}`, showViewType: showCustom },
    ],
    [
      "errors",
      //
      { menuLabel: "Custom JSON syntax errors", title: `Errors — ${dataSourcePath}`, showViewType: showErrors },
    ],
  ];

  const isEnabled = (/*viewType: ViewType*/): boolean => true;

  const [{ showViewType }, menu] = showMenu(kvps, isEnabled, sqlCustom.viewState, (title) => display.setTitle(title));

  const showAppOptions = (appOptions: AppOptions): Promise<void> => {
    display.showAppOptions(appOptions);
    return Promise.resolve();
  };
  const showException = (error: unknown): void => display.showException(error);

  return { menu, show: { showAppOptions, showViewType, showException, showCustomdDetails } };
};
