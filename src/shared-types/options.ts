export type ViewOptions = {
  showGrouped: boolean;
};
export const defaultViewOptions: ViewOptions = { showGrouped: true };

export type AppOptions = {
  zoomPercent: number;
  fontSize: number;
};
export const defaultAppOptions: AppOptions = { zoomPercent: 100, fontSize: 12 };
