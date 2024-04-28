import { Groups } from "./grouped";
import { Image } from "./image";

export type ReferenceViewOptions = {
  showGrouped: boolean;
  leafVisible: string[];
  groupExpanded: string[];
  viewType: "references";
};

export type TopType = "assembly" | "namespace" | "none";

export type MethodViewOptions = {
  showGrouped: boolean;
  leafVisible: string[];
  groupExpanded: string[];
  topType: TopType;
  methodId: {
    assemblyName: string;
    metadataToken: number;
  };
  viewType: "methods";
};

export type ViewOptions = ReferenceViewOptions | MethodViewOptions;

export const defaultReferenceViewOptions: ReferenceViewOptions = {
  showGrouped: true,
  leafVisible: [],
  groupExpanded: [],
  viewType: "references",
};

export const defaultMethodViewOptions: MethodViewOptions = {
  showGrouped: true,
  leafVisible: [],
  groupExpanded: [],
  topType: "assembly",
  methodId: { assemblyName: "", metadataToken: 0 },
  viewType: "methods",
};

export type ViewType = "references" | "methods";

export type DataSourceId = {
  cachedWhen: string;
  hash: string;
};

export type ViewData = {
  // string is a message if there isn't an Image
  image: Image | string;

  // could send null if previously-sent Groups has not changed
  // but that would require useState and useEffect in the render
  // https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state
  groups: Groups;

  viewOptions: ViewOptions;
};

export type View = ViewData & { dataSourceId: DataSourceId };
