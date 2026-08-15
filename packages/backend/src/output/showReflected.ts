import type { DisplayApi } from "../contracts-app";
import type { AppOptions, GraphFilter, GraphOptions, ViewDetails, ViewGraph } from "../contracts-ui";
import { nodeIdToText } from "../contracts-ui";
import { bindImage } from "../image";
import { getClusterNames, isMethodNodeId, MethodNodeId, textToAnyNodeId, toNodeId } from "../nodeIds";
import { SqlLoaded } from "../sql";
import {
  convertCallstackToImage,
  convertLoadedToCalls,
  convertLoadedToCallstack,
  convertLoadedToDetailedAssembly,
  convertLoadedToReferences,
} from "./helpers";
import type { ShowReflected } from "./types";

export const showReflected = (display: DisplayApi, sqlLoaded: SqlLoaded): ShowReflected => {
  const createImage = bindImage(display.convertPathToUrl);

  const showAppOptions = (appOptions: AppOptions): Promise<void> => {
    display.showAppOptions(appOptions);
    return Promise.resolve();
  };

  // methods in ShowReflected

  const showMethodDetails = (methodNodeId: MethodNodeId): Promise<void> => {
    const viewDetails: ViewDetails = { ...sqlLoaded.readMethodDetails(methodNodeId), detailType: "methodDetails" };
    display.showDetails(viewDetails);
    return Promise.resolve();
  };
  const showAssemblyDetails = (assemblyName: string): Promise<void> => {
    const typeInfos = sqlLoaded.readTypeInfos(assemblyName);
    const types = convertLoadedToDetailedAssembly(typeInfos, assemblyName);
    display.showDetails(types);
    return Promise.resolve();
  };
  const showException = (error: unknown): void => display.showException(error);
  const showTitle = (title: string): void => display.showTitle(title);

  const showReferences = async (): Promise<void> => {
    const graphData = convertLoadedToReferences(
      sqlLoaded.readAssemblyReferences(),
      sqlLoaded.viewState.referenceViewOptions,
      sqlLoaded.readGraphFilter("references", "assembly"),
      sqlLoaded.viewState.exes
    );
    const image = await createImage(graphData.imageData);
    const viewGraph: ViewGraph = {
      image,
      groups: graphData.groups,
      graphFilter: graphData.graphFilter,
      graphViewOptions: graphData.graphViewOptions,
    };
    display.showView(viewGraph);
  };

  const showApis = async (): Promise<void> => {
    const apiViewOptions = sqlLoaded.viewState.apiViewOptions;
    const clusterBy = apiViewOptions.showClustered.clusterBy;
    const graphFilter = sqlLoaded.readGraphFilter("apis", clusterBy);
    const calls = sqlLoaded.readCalls(
      clusterBy,
      apiViewOptions.showInternalCalls ? getClusterNames(graphFilter.groupExpanded, clusterBy) : []
    );
    display.showLoadingMessage(undefined, `${calls.length} records`);
    const elements = convertLoadedToCalls(calls);
    const graphData = convertCallstackToImage(elements, sqlLoaded.readNames(), apiViewOptions, graphFilter);
    const image = await createImage(graphData.imageData);
    const viewGraph: ViewGraph = {
      image,
      groups: graphData.groups,
      graphFilter: graphData.graphFilter,
      graphViewOptions: graphData.graphViewOptions,
    };
    display.showView(viewGraph);
  };

  return { showAppOptions, showMethodDetails, showAssemblyDetails, showException, showTitle, showReferences, showApis }; // methods in Map<ViewType, ViewTypeData>
};

export const showMethods = async (display: DisplayApi, sqlLoaded: SqlLoaded, methodId: MethodNodeId): Promise<void> => {
  const createImage = bindImage(display.convertPathToUrl);

  const getMethodNodeId = (methodViewOptions: GraphOptions.Methods): MethodNodeId => {
    if (!methodViewOptions.methodId) throw new Error("No methodId");
    const nodeId = textToAnyNodeId(nodeIdToText(methodViewOptions.methodId));
    if (!isMethodNodeId(nodeId)) throw new Error("Not MethodNodeId");
    return nodeId;
  };

  const methodViewOptions = sqlLoaded.viewState.methodViewOptions;
  const callstackIterator = sqlLoaded.readCallstack(methodId ?? getMethodNodeId(methodViewOptions));
  const callstackElements = convertLoadedToCallstack(callstackIterator);

  display.showLoadingMessage(undefined, `${callstackElements.leafs.length()} records`);

  const graphFilter: GraphFilter | undefined = methodId
    ? undefined
    : sqlLoaded.readGraphFilter(methodViewOptions.graphType, methodViewOptions.showClustered.clusterBy);

  const graphData = convertCallstackToImage(callstackElements, sqlLoaded.readNames(), methodViewOptions, graphFilter);

  if (methodId) {
    sqlLoaded.writeGraphFilter(
      methodViewOptions.graphType,
      methodViewOptions.showClustered.clusterBy,
      graphData.graphFilter
    );
    methodViewOptions.methodId = toNodeId(methodId);
    sqlLoaded.viewState.methodViewOptions = methodViewOptions;
  }

  const image = await createImage(graphData.imageData);
  const viewGraph: ViewGraph = {
    image,
    groups: graphData.groups,
    graphFilter: graphData.graphFilter,
    graphViewOptions: graphData.graphViewOptions,
  };
  display.showView(viewGraph);
};
