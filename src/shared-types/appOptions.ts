import { DetailType } from "./viewDetails";
import { ViewType } from "./viewOptions";

export type OptionsType = ViewType | DetailType | "app";

export type AppOptions = {
  zoomPercent: number;
  fontSize: number;
  detailsClosed?: OptionsType[];

  showCompilerGeneratedTypes?: boolean;
  showCompilerGeneratedMethod?: boolean;
  showCompilerGeneratedMenuItem?: boolean;
};
export const defaultAppOptions: AppOptions = { zoomPercent: 100, fontSize: 12 };
