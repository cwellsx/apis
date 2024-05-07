import { AreaClass } from "./image";
import { ViewType } from "./view";

// import OnGraphClick into the renderer-side code, but avoid importing MouseEvent
// because it can be confusing because there's also a React.MouseEvent and a DOM MouseEvent
export type MouseEvent = {
  altKey: boolean;
  button: number;
  buttons: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

export type GraphEvent = { id: string; className: AreaClass; viewType: ViewType; event: MouseEvent };

export type OnGraphViewClick = (graphEvent: GraphEvent) => void;

export type OnDetailClick = (assemblyId: string, id: string) => void;
