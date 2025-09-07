import * as vscode from "vscode";
import { Uris } from "./uris";

// this code is derived from https://github.com/microsoft/vscode-extension-samples/blob/main/webview-sample/src/extension.ts

// const folder = "C:\\Dev\\sys-view\\src\\graph-data";
// const folderUri = vscode.Uri.file(folder);
// const filenameUri = vscode.Uri.joinPath(folderUri, "assemblies.svg");

const getWebviewContent = async (webview: vscode.Webview, uris: Uris): Promise<string> => {
  const getNonce = () => {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  };

  type Pair = [string, vscode.Uri];
  const pairs: Pair[] = [
    ["stylesResetUri", uris.joinMediaUri("reset.css")],
    ["scriptUri", uris.joinMediaUri("webview.js")],
  ];

  let html = await uris.loadMediaFile("webview.html");

  const replace = (name: string, value: string): any => {
    html = html.replaceAll(`\${${name}}`, value);
  };

  pairs.forEach(([name, uri]) => {
    const webviewUri = webview.asWebviewUri(uri);
    replace(name, webviewUri.toString());
  });

  replace("nonce", getNonce());

  return html;
};

export const showWebview = async (context: vscode.ExtensionContext, uris: Uris) => {
  // could use registerWebviewPanelSerializer here to call createWebviewPanel later in a delegate
  // see https://code.visualstudio.com/api/extension-guides/webview#serialization
  // but apparently that's for restoring "when VS Code restarts"

  // Instead for now we recreate from scratch if VS Code is restarted.

  // Therefore this function and the activate function which calls it are async.

  const panel = vscode.window.createWebviewPanel(
    "imageMapView", // Identifies the type of the webview
    "Image Map Viewer", // Title of the panel
    vscode.ViewColumn.One, // Editor column to show the new webview panel
    {
      enableScripts: true,
      localResourceRoots: [uris.mediaUri],
    }
  );

  panel.webview.html = await getWebviewContent(panel.webview, uris);

  context.subscriptions.push(panel);
};
