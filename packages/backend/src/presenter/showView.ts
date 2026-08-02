import type { Leaf, MethodNodeType } from "../contracts-ui";

export type MethodNode = Leaf & { type: MethodNodeType };

export type ShowView = {
  showMethodDetails: (methodNodeId: MethodNode) => Promise<void>;
  showAssemblyDetails: (assemblyName: string) => Promise<void>;
  // this means "show graph of all calls"
  showViewType: () => Promise<void>;
  // this means "show call stack"
  showMethods: (methodId: MethodNode) => Promise<void>;
  // showAppOptions: (appOptions: AppOptions) => Promise<void>;
  showException: (error: unknown) => void;
};
