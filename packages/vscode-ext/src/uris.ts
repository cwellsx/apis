import fs from "fs";
import path from "path";
import * as vscode from "vscode";

// this contains method to return Uri values
// these methods may be called at run-time
// but depend on the context which is only available when it's passed to the activate function

export type Uris = {
  mediaUri: vscode.Uri;
  joinMediaUri: (filename: string) => vscode.Uri;
  loadMediaFile: (filename: string) => Promise<string>;
};

export const getUris = (context: vscode.ExtensionContext): Uris => {
  const mediaUri = vscode.Uri.joinPath(context.extensionUri, "media");

  const joinMediaUri = (filename: string): vscode.Uri => {
    if (!fs.existsSync(path.join(context.extensionPath, "media", filename))) {
      throw new Error(`Media file not found: ${filename}`);
    }
    return vscode.Uri.joinPath(context.extensionUri, "media", filename);
  };

  const loadMediaFile = async (filename: string): Promise<string> => {
    const fileUri = joinMediaUri(filename);
    const bytes = await vscode.workspace.fs.readFile(fileUri);
    return new TextDecoder("utf-8").decode(bytes);
  };

  return { mediaUri, joinMediaUri, loadMediaFile };
};
