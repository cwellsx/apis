import { MenuItem, PresenterApi } from "backend-app";
import { BrowserWindow } from "electron";

export type SetMenuItems = (menuItems: MenuItem[], presenterApi: PresenterApi) => void;

export type AppWindow = { presenterApi: PresenterApi; browserWindow: BrowserWindow; setMenuItems: SetMenuItems };
