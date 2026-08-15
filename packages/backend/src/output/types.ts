import { AppOptions, NodeId } from "../contracts-ui";
import { MethodNodeId } from "../nodeIds";

export type ShowBase = {
  showAppOptions: (appOptions: AppOptions) => Promise<void>;
  showException: (error: unknown) => void;
  showTitle: (title: string) => void;
};

export type ShowReflected = ShowBase & {
  // these are void not Promise<void> because they don't depend on GraphViz
  showMethodDetails: (methodNodeId: MethodNodeId) => Promise<void>;
  showAssemblyDetails: (assemblyName: string) => Promise<void>;
  showReferences: () => Promise<void>;
  showApis: () => Promise<void>;
};

export type ShowCustom = ShowBase & {
  // these are void not Promise<void> because they don't depend on GraphViz
  showGraphCustom: () => Promise<void>;
  showCustomdDetails: (id: NodeId) => Promise<void>;
};

export type ShowMethod = (methodNodeId: MethodNodeId) => Promise<void>;
