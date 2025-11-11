import type { AppConfig, DisplayApi } from "../contracts-app";
import type {
  AppOptions,
  GraphFilter,
  MethodViewOptions,
  ViewCompiler,
  ViewDetails,
  ViewErrors,
  ViewType,
} from "../contracts-ui";
import { nodeIdToText } from "../contracts-ui";
import { convertLoadedToDetailedAssembly } from "../convertLoadedToDetailedAssembly";
import { convertCallstackToImage, convertLoadedToCalls, convertLoadedToCallstack } from "../convertLoadedToMethods";
import { convertLoadedToReferences } from "../convertLoadedToReferences";
import { bindImage } from "../image";
import { getClusterNames, isMethodNodeId, MethodNodeId, textToAnyNodeId, toNodeId } from "../nodeIds";
import { SqlLoaded } from "../sql";
import { KVP, showMenu } from "./showMenu";
import type { Show, ShowReflected, ShowTitle } from "./types";

const getShowRelected = (
  display: DisplayApi,
  sqlLoaded: SqlLoaded,
  showViewType: () => Promise<void>
): ShowReflected => {
  // methods in ShowBase

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
  return { showAppOptions, showViewType, showMethodDetails, showAssemblyDetails, showException };
};

export const showReflected = (
  display: DisplayApi,
  sqlLoaded: SqlLoaded,
  appConfig: AppConfig,
  dataSourcePath: string
): Show<ShowReflected> => {
  const createViewGraph = bindImage(display.convertPathToUrl);

  // methods in Map<ViewType, ViewTypeData>

  const showReferences = async (): Promise<void> => {
    const graphData = convertLoadedToReferences(
      sqlLoaded.readAssemblyReferences(),
      sqlLoaded.viewState.referenceViewOptions,
      sqlLoaded.readGraphFilter("references", "assembly"),
      sqlLoaded.viewState.exes
    );
    const viewGraph = await createViewGraph(graphData);
    display.showView(viewGraph);
  };

  const showErrors = (): Promise<void> => {
    const errors = sqlLoaded.readErrors();

    const viewErrors: ViewErrors = { errors, viewType: "errors" };
    display.showView(viewErrors);
    return Promise.resolve();
  };

  const showApis = async (): Promise<void> => {
    const apiViewOptions = sqlLoaded.viewState.apiViewOptions;
    const clusterBy = apiViewOptions.showClustered.clusterBy;
    const graphFilter = sqlLoaded.readGraphFilter("apis", clusterBy);
    const calls = sqlLoaded.readCalls(
      clusterBy,
      apiViewOptions.showInternalCalls ? getClusterNames(graphFilter.groupExpanded, clusterBy) : []
    );
    display.showMessage(undefined, `${calls.length} records`);
    const elements = convertLoadedToCalls(calls);
    const graphData = convertCallstackToImage(elements, sqlLoaded.readNames(), apiViewOptions, graphFilter);
    const viewGraph = await createViewGraph(graphData);
    display.showView(viewGraph);
  };

  const showCompiler = (): Promise<void> => {
    const { compilerMethods, localsTypes } = sqlLoaded.readCompiler();
    const compilerViewOptions = sqlLoaded.viewState.compilerViewOptions;
    const viewCompiler: ViewCompiler = {
      compilerMethods,
      localsTypes,
      viewType: "compiler",
      textViewOptions: compilerViewOptions,
    };
    display.showView(viewCompiler);
    return Promise.resolve();
  };

  const kvps: KVP[] = [
    [
      "references",
      //
      { menuLabel: "Assemblies", title: `References — ${dataSourcePath}`, showViewType: showReferences },
    ],
    [
      "errors",
      //
      { menuLabel: ".NET reflection errors", title: `Errors — ${dataSourcePath}`, showViewType: showErrors },
    ],
    [
      "apis",
      //
      { menuLabel: "APIs", title: `APIs — ${dataSourcePath}`, showViewType: showApis },
    ],
    [
      "compiler",
      //
      { menuLabel: "Compiler-generated", title: `Compiler — ${dataSourcePath}`, showViewType: showCompiler },
    ],
  ];

  const isEnabled = (viewType: ViewType): boolean => {
    switch (viewType) {
      case "references":
      case "apis":
        return true;
      case "errors":
        return sqlLoaded.readErrors().length !== 0;
      case "compiler":
        return !!appConfig.appOptions.showCompilerGeneratedMenuItem;
      default:
        throw new Error(`Unknown viewType: ${viewType}`);
    }
  };

  const [{ showViewType }, menu] = showMenu(kvps, isEnabled, sqlLoaded.viewState, (title) => display.setTitle(title));

  return { menu, show: getShowRelected(display, sqlLoaded, showViewType) };
};

export const showMethods = (
  display: DisplayApi,
  sqlLoaded: SqlLoaded,
  methodId: MethodNodeId
): ShowTitle<ShowReflected> => {
  const createViewGraph = bindImage(display.convertPathToUrl);

  const showViewType = async (): Promise<void> => {
    const getMethodNodeId = (methodViewOptions: MethodViewOptions): MethodNodeId => {
      if (!methodViewOptions.methodId) throw new Error("No methodId");
      const nodeId = textToAnyNodeId(nodeIdToText(methodViewOptions.methodId));
      if (!isMethodNodeId(nodeId)) throw new Error("Not MethodNodeId");
      return nodeId;
    };

    const methodViewOptions = sqlLoaded.viewState.methodViewOptions;
    const callstackIterator = sqlLoaded.readCallstack(methodId ?? getMethodNodeId(methodViewOptions));
    const callstackElements = convertLoadedToCallstack(callstackIterator);

    display.showMessage(undefined, `${callstackElements.leafs.length()} records`);

    const graphFilter: GraphFilter | undefined = methodId
      ? undefined
      : sqlLoaded.readGraphFilter(methodViewOptions.viewType, methodViewOptions.showClustered.clusterBy);

    const graphData = convertCallstackToImage(callstackElements, sqlLoaded.readNames(), methodViewOptions, graphFilter);

    if (methodId) {
      sqlLoaded.writeGraphFilter(
        methodViewOptions.viewType,
        methodViewOptions.showClustered.clusterBy,
        graphData.graphFilter
      );
      methodViewOptions.methodId = toNodeId(methodId);
      sqlLoaded.viewState.methodViewOptions = methodViewOptions;
    }

    const viewGraph = await createViewGraph(graphData);
    display.showView(viewGraph);
  };

  // TODO add method name to title
  return { show: getShowRelected(display, sqlLoaded, showViewType), title: `Callstack` };
};
