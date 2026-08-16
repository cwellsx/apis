export type DetailsType = "app" | "graph";

export type AppOptions = {
  // these are displayed as text and changed using Ctrol-Scroll of the mouse
  zoomPercent: number;
  fontSize: number;

  // these determine which <details> elements are expanded
  detailsClosed?: DetailsType[];

  // these will be obsolete in the newer version,
  // so there won't yet be any app options to display
  showCompilerGeneratedTypes?: boolean;
  showCompilerGeneratedMethod?: boolean;
};
export const defaultAppOptions: AppOptions = { zoomPercent: 100, fontSize: 12 };
