import type { BrowserWindow } from "electron";
import type { RendererApi, Types, View } from "../shared-types";
import { getErrorString } from "./error";

export interface IShow {
  exception: (error: unknown) => void;
  message: (title: string, message: string) => void;
  view: (view: View) => void;
  types: (types: Types) => void;
}

export class Show implements IShow {
  exception: (error: unknown) => void;
  message: (title: string, message: string) => void;
  view: (view: View) => void;
  types: (types: Types) => void;

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
  }
}
