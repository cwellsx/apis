import * as vscode from "vscode";

export const getAppSettings = () => {
  const config = vscode.workspace.getConfiguration("sysView");

  const zoomPercent = config.get<number>("zoomPercent");
  const fontSize = config.get<number>("fontSize");

  return { zoomPercent, fontSize };
};
