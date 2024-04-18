import type { BrowserWindow } from "electron";
import type { AppOptions, CallStack, Renderer2Api, RendererApi, Types, View } from "../shared-types";
import { getErrorString } from "./error";

export interface IShow {
  exception: (error: unknown) => void;
  message: (title: string, message: string) => void;
  view: (view: View) => void;
  types: (types: Types) => void;
  appOptions: (appOptions: AppOptions) => void;
}

export class Show implements IShow {
  exception: (error: unknown) => void;
  message: (title: string, message: string) => void;
  view: (view: View) => void;
  types: (types: Types) => void;
  appOptions: (appOptions: AppOptions) => void;

  constructor(mainWindow: BrowserWindow) {
    // implement RendererApi using webContents.send
    const webContents = mainWindow.webContents;
    const rendererApi: RendererApi = {
      setGreeting(greeting: string): void {
        webContents.send("setGreeting", greeting);
      },
      showView(view: View): void {
        webContents.send("showView", view);
      },
      showTypes(types: Types): void {
        webContents.send("showTypes", types);
      },
      showAppOptions(appOptions: AppOptions): void {
        webContents.send("showAppOptions", appOptions);
      },
    };

    this.exception = (error: unknown): void => {
      mainWindow.setTitle("Error");
      const message = getErrorString(error);
      rendererApi.setGreeting(message);
    };

    this.message = (title: string, message: string): void => {
      mainWindow.setTitle(title);
      rendererApi.setGreeting(message);
    };

    this.view = (view: View) => rendererApi.showView(view);

    this.types = (types: Types) => rendererApi.showTypes(types);

    this.appOptions = (appOptions: AppOptions) => rendererApi.showAppOptions(appOptions);
  }
}

export const renderer2 = (secondWindow?: BrowserWindow): Renderer2Api => {
  const showAppOptions = (appOptions: AppOptions) => secondWindow?.webContents.send("showAppOptions", appOptions);
  const showCallStack = (callStack: CallStack) => secondWindow?.webContents.send("showCallStack", callStack);

  return { showAppOptions, showCallStack };
};
