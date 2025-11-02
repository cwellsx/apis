import { RendererApi } from "../ui";
import { MainApiAsync } from "./mainApi";
import { SetViewMenu } from "./setViewMenu";

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
