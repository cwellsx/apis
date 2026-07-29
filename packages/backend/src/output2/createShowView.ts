import type { DisplayApi } from "../contracts-app";
import { ViewState } from "../viewState";
import { MethodNode, ShowView } from "./showView";

export const createShowView = (display: DisplayApi, viewState: ViewState): ShowView => {
  const showMethodDetails = (methodNodeId: MethodNode): Promise<void> => {
    throw new Error();
  };
  const showAssemblyDetails = (assemblyName: string): Promise<void> => {
    throw new Error();
  };
  // this means "show graph of all calls"
  const showViewType = (): Promise<void> => {
    throw new Error();
  };
  // this means "show call stack"
  const showMethods = (methodId: MethodNode): Promise<void> => {
    throw new Error();
  };
  // showAppOptions: (appOptions: AppOptions) => Promise<void>;
  const showException = (error: unknown): void => {
    throw new Error();
  };

  return { showMethodDetails, showAssemblyDetails, showViewType, showMethods, showException };
};
