import * as fs from "fs";
import path from "path";
import { createSqlDatabase } from "sqlio";
import * as vscode from "vscode";

export const createAdaptor = (context: vscode.ExtensionContext) => {
  // Placeholder for adaptor creation logic
  console.log("Adaptor created");
  const workspaceCachePath = context.storageUri?.fsPath;
  const globalCachePath = context.globalStorageUri.fsPath;

  console.log("Workspace cache path:", workspaceCachePath);
  console.log("Global cache path:", globalCachePath);

  const dbPath = workspaceCachePath ?? globalCachePath;

  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }

  const dbFilename = path.join(dbPath, "example.db");
  const db = createSqlDatabase(dbFilename, path.join(context.extensionPath, "native", "better_sqlite3.node"));

  console.log("datbase created:", dbFilename);

  // Wrap cleanup in a Disposable
  const disposable = {
    dispose: () => {
      db.done();
      db.close();
    },
  };

  context.subscriptions.push(disposable);
};
