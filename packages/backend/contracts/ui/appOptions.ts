export type DetailsType = "app" | "graph";

export type AppOptions = {
  // these are displayed as text and changed using Ctrol-Scroll of the mouse
  zoomPercent: number;
  fontSize: number;

  // when enabled, a namespace which extends another is a node inside it -- Foo.Bar.Baz inside Foo.Bar
  clusterNamespaces: boolean;
};
export const defaultAppOptions: AppOptions = { zoomPercent: 100, fontSize: 13, clusterNamespaces: true };
