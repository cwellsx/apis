// Not an option yet: the details view is chosen by the UI rather than by a setting, so nothing reads this type.
// It is kept because the same shape may become an option -- we may want to configure which option <details> are
// open, and/or which details tab is selected in the Layout.
// export type DetailsType = "app" | "graph";

export type AppOptions = {
  // these are displayed as text and changed using Ctrol-Scroll of the mouse
  zoomPercent: number;
  fontSize: number;
};
export const defaultAppOptions: AppOptions = { zoomPercent: 100, fontSize: 13 };

// the values which zoomPercent may take, and which control-scroll steps through
// divisor is set to halve after 6 clicks i.e. 1.122462
export const zooms = [
  20, 22, 25, 28, 31, 35, 40, 45, 50, 56, 63, 75, 80, 90, 100, 110, 125, 140, 160, 180, 200, 225, 250, 280,
];
