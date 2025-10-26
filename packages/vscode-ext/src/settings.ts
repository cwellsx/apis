import * as vscode from "vscode";

export const getAppSettings = () => {
  const config = vscode.workspace.getConfiguration("sysView");

  const zoomPercent = config.get<number>("zoomPercent");
  const fontSize = config.get<number>("fontSize");
  const showCompilerGeneratedTypes = config.get<boolean>("showCompilerGeneratedTypes");
  const showCompilerGeneratedMethod = config.get<number>("showCompilerGeneratedMethod");

  return {
    zoomPercent,
    fontSize,
    showCompilerGeneratedTypes,
    showCompilerGeneratedMethod,
  };
};
