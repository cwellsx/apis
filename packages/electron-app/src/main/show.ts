import { getErrorString } from "backend-api";
import { AnyView } from "backend-ui";
import type { BrowserWindow } from "electron";
import { IPC_CHANNELS } from "../shared";
import { convertPathToUrl } from "./convertPathToUrl";

export const show = (browserWindow: BrowserWindow, views: AnyView[]) => {
  // intercept title which is set in main using browserWindow API
  const title = views.find((view) => view.type == "title")?.payload;
  if (title) browserWindow.setTitle(title);

  // convert image path to URL
  const imageView = views.find((view) => view.type == "image")?.payload;
  if (imageView && !(typeof imageView.image === "string"))
    imageView.image.imagePath = convertPathToUrl(imageView.image.imagePath);

  browserWindow.webContents.send(IPC_CHANNELS.show, views);
};

export const showMessage = (browserWindow: BrowserWindow, title: string | undefined, message: string): void => {
  const views: AnyView[] = [{ type: "text", payload: { text: message } }];
  if (title) views.push({ type: "title", payload: title });
  show(browserWindow, views);
};

export const showErrorMessage = (browserWindow: BrowserWindow, title: string | undefined, message: string): void => {
  const views: AnyView[] = [{ type: "text", payload: { text: message } }];
  if (title) views.push({ type: "title", payload: title });
  show(browserWindow, views);
};

export const showException = (browserWindow: BrowserWindow, error: unknown): void => {
  const message = getErrorString(error);
  showErrorMessage(browserWindow, "Error", message);
};
