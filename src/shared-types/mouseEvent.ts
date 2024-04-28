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

export type OnGraphViewClick = (id: string, viewType: ViewType, event: MouseEvent) => void;
export type OnGraphClick = (id: string, event: MouseEvent) => void;

export type OnDetailClick = (assemblyId: string, id: string) => void;
