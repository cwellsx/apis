import { RendererApi, ViewType } from "../ui";
import { MainApiAsync } from "./types";

export type ViewMenuItem = { label: string; viewType: ViewType };

export type ViewMenu = {
  menuItems: ViewMenuItem[];
  currentViewType: ViewType | undefined;
  showViewType: (viewType: ViewType) => Promise<void>;
};

export type SetViewMenu = (viewMenu: ViewMenu) => void;

// this extends RendererApi without additional preloaded IPC methods

export type CreateWindow = (display: DisplayApi, setViewMenu: SetViewMenu) => Promise<MainApiAsync>;

export type ConvertPathToUrl = (urlPath: string) => string;

export type DisplayApi = RendererApi & {
  showException: (error: unknown) => void;
  showMessage: (title: string | undefined, message: string) => void;
  setTitle: (title: string) => void;
  createSecondWindow: (delegate: CreateWindow) => Promise<void>;
  convertPathToUrl: ConvertPathToUrl;
};
