import { AppConfig } from "./appConfig";
import { DisplayApi } from "./displayApi";
import { SetMenuItems } from "./menuApi";

export type RuntimeContext = { display: DisplayApi; setMenuItems: SetMenuItems; appConfig: AppConfig };
