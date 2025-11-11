import { ViewMenuItem } from "../contracts-app";
import { AppOptions, NodeId, ViewType } from "../contracts-ui";
import { MethodNodeId } from "../nodeIds";

// methods to implement the view menu
export type MenuViewTypes = {
  currentViewType: () => ViewType;
  viewMenuItems: () => ViewMenuItem[];
  changeViewType: (newViewType: ViewType) => Promise<void>;
  showTitle: () => void;
};

export type ShowBase = {
  showViewType: () => Promise<void>;
  showAppOptions: (appOptions: AppOptions) => Promise<void>;
  showException: (error: unknown) => void;
};

export type ShowReflected = ShowBase & {
  // these are void not Promise<void> because they don't depend on GraphViz
  showMethodDetails: (methodNodeId: MethodNodeId) => Promise<void>;
  showAssemblyDetails: (assemblyName: string) => Promise<void>;
};

export type ShowCustom = ShowBase & {
  // these are void not Promise<void> because they don't depend on GraphViz
  showCustomdDetails: (id: NodeId) => Promise<void>;
};

export type ShowTitle<T> = { show: T; title: string };
export type Show<T> = { show: T; menu: MenuViewTypes };
