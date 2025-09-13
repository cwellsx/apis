import * as vscode from "vscode";

export const selectFolder = async () => {
  const folderUris = await vscode.window.showOpenDialog({
    canSelectFolders: true,
    canSelectFiles: false,
    canSelectMany: false,
    openLabel: "Select Folder",
  });

  if (folderUris && folderUris.length > 0) {
    const selectedFolder = folderUris[0];
    vscode.window.showInformationMessage(`Selected folder: ${selectedFolder.fsPath}`);
  }
};

export const helloWorld = async () =>
  vscode.window.showInformationMessage("Hello World from SysView!");

export const openSettings = async () => {
  await vscode.commands.executeCommand("workbench.action.openSettings", "sysView");
};
