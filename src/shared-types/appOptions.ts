import { DetailType } from "./viewDetails";
import { ViewType } from "./viewOptions";

export type AppOptions = {
  zoomPercent: number;
  fontSize: number;
  detailsClosed?: (ViewType | DetailType)[];
};
export const defaultAppOptions: AppOptions = { zoomPercent: 100, fontSize: 12 };
