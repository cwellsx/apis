import * as vscode from 'vscode';

class TreeView implements vscode.TreeDataProvider<vscode.TreeItem> {
    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): vscode.ProviderResult<vscode.TreeItem[]> {
        return [new vscode.TreeItem("Hello World")];
    }
}

export const createTreeView = (context: vscode.ExtensionContext, viewId: string) => {
    const treeDataProvider = new TreeView();
    const treeView = vscode.window.createTreeView(viewId, { treeDataProvider });
    context.subscriptions.push(treeView);
    context.subscriptions.push(
        treeView.onDidExpandElement(e => {
            console.log("Expanded:", e.element.label);
        }),
        treeView.onDidCollapseElement(e => {
            console.log("Collapsed:", e.element.label);
        })
    );
}