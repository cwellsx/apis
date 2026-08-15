# `ViewMenu``

The `ViewMenu` API is designed to be implemented by

- QuickPick in a VSCode extension
- Menu in an Electron application

## Electron

Electron has an API e.g. like this

```ts
const setViewMenu: SetViewMenu = (viewMenu: ViewMenu) => {
  const { menuItems, currentViewType, showViewType } = viewMenu;
  const setViewType = async (newViewType: ViewType) => {
    // update the view
    await showViewType(newViewType);
    // update this menu
    editMenu(newViewType);
  };
  const editMenu = (newViewType: ViewType): void => {
    viewSubmenu = menuItems.map(({ menuLabel, viewType }) => ({
      label: menuLabel,
      type: "checkbox",
      checked: viewType === newViewType,
      click:
        viewType === newViewType
          ? undefined
          : () => setViewType(viewType).catch((error) => display.showException(error)),
    }));
    setMenu();
  };
  editMenu(currentViewType);
};
```

The MenuItemConstructorOptions include:

- label
- click -- a function in the item invoked when that item is clicked
- checked -- a Boolean
- type -- hardcoded as 'checkbox'

The menu is redrawn when the selection changes.

## VS Code extension

The API is like this

```ts
function showGraphTypePicker(current: string) {
  const qp = vscode.window.createQuickPick();

  const types = ["References", "Methods", "APIs", "Custom"];

  qp.items = types.map((label) => ({ label, picked: label === current }));

  qp.onDidAccept(() => {
    const selected = qp.selectedItems[0].label;

    // Update checkmarks
    qp.items = qp.items.map((item) => ({ ...item, picked: item.label === selected }));

    // Notify your extension
    changeGraphType(selected);

    qp.hide();
  });

  qp.show();
}
```

- The items have only `label` and `picked`
- There's a onDidAccept callback when an item is picked
- There's a selectedItems initialized by the framework which can be queried during the callback

Properties on an item are as follows

```ts
interface QuickPickItem {
  label: string;
  description?: string;
  detail?: string;
  picked?: boolean;
  alwaysShow?: boolean;
}
```

## Decision

The new "abstract" API will be biased towards being implementable using the VS Code extension API.

For example the VS Code can implement and use the API like this

```ts
qp.onDidAccept(() => {
  const selected = qp.selectedItems[0];
  api.onSelect(selected);
  qp.hide(); // VS Code must close manually
});
```
