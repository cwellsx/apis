import * as vscode from "vscode";

const folder = "C:\\Dev\\sys-view\\src\\graph-data";
const folderUri = vscode.Uri.file(folder);
const filenameUri = vscode.Uri.joinPath(folderUri, "assemblies.svg");

function getWebviewContent(webview: vscode.Webview): string {
  const imageSrc = webview.asWebviewUri(filenameUri);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Image Map</title>
    </head>
    <body>
      <h2>Interactive Image Map</h2>
      <img src="${imageSrc}" usemap="#image-map" alt="Interactive Image" />
      <map name="image-map">
        <area shape="rect" coords="34,44,270,350" href="https://example.com/section1" alt="Section 1" />
        <area shape="circle" coords="337,300,44" href="https://example.com/section2" alt="Section 2" />
      </map>
    </body>
    </html>
  `;
}

export const showGraph = (context: vscode.ExtensionContext) => {
  const panel = vscode.window.createWebviewPanel(
    "imageMapView", // Identifies the type of the webview
    "Image Map Viewer", // Title of the panel
    vscode.ViewColumn.One, // Editor column to show the new webview panel
    {
      enableScripts: true,
      localResourceRoots: [folderUri],
    }
  );

  panel.webview.html = getWebviewContent(panel.webview);

  context.subscriptions.push(panel);
};
