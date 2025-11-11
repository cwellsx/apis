import { RendererApi } from "../ui";
import { MainApiAsync } from "./mainApi";

// this extends RendererApi without additional preloaded IPC methods

export type SecondDisplay = (display: DisplayApi) => Promise<MainApiAsync>;

export type ConvertPathToUrl = (urlPath: string) => string;

export type DisplayApi = RendererApi & {
  showException: (error: unknown) => void;
  showMessage: (title: string | undefined, message: string) => void;
  setTitle: (title: string) => void;
  createSecondDisplay: (delegate: SecondDisplay) => Promise<void>;
  convertPathToUrl: ConvertPathToUrl;
};
