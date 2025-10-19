// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { hello } from "shared";
import * as vscode from "vscode";
import { createAdaptor } from "./adapter";
import { helloWorld, openSettings, selectFolder } from "./command";
import { createTreeView } from "./treeView";
import { getUris } from "./uris";
import { showWebview } from "./webview";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export const activate = async (context: vscode.ExtensionContext) => {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "sys-view" is now active');

  var helloMessage = hello();
  console.log(helloMessage);

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  context.subscriptions.push(
    vscode.commands.registerCommand("sys-view.helloWorld", helloWorld),
    vscode.commands.registerCommand("sys-view.selectFolder", selectFolder),
    vscode.commands.registerCommand("sys-view.openSettings", openSettings)
  );

  createTreeView(context, "sysViewOne");
  createTreeView(context, "sysViewTwo");

  const uris = getUris(context);

  await showWebview(context, uris);

  createAdaptor(context);
};

// This method is called when your extension is deactivated
export function deactivate() {}
