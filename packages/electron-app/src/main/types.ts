import { DataSource, MenuItem, PresenterApi } from "backend-app";
import { BrowserWindow } from "electron";

export type SetMenuItems = (menuItems: MenuItem[], presenterApi: PresenterApi) => void;

export type WindowContext = { presenterApi: PresenterApi; browserWindow: BrowserWindow; setMenuItems: SetMenuItems };

// this function invokes openDataSource and binds the result to the WindowContext
export type BindDataSource = (dataSource: DataSource) => Promise<void>;
