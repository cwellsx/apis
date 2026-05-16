# Node implementations

There are two implementations of nodes.

## electron-app

Uses:

- https://github.com/jakezatecky/react-checkbox-tree

Individual nodes within the `nodes` property can have the following structure:

| Property       | Type   | Description                              | Default |
| -------------- | ------ | ---------------------------------------- | ------- |
| `label`        | mixed  | **Required**. The node's label.          |         |
| `value`        | mixed  | **Required**. The node's value.          |         |
| `children`     | array  | An array of child nodes.                 | `null`  |
| `className`    | string | A className to add to the node.          | `null`  |
| `disabled`     | bool   | Whether the node should be disabled.     | `false` |
| `icon`         | mixed  | A custom icon for the node.              | `null`  |
| `showCheckbox` | bool   | Whether the node should show a checkbox. | `true`  |
| `title`        | string | A custom `title` attribute for the node. | `null`  |

Some of the properties like "expanded" are properties of the tree instead.

| Property             | Type     | Description                                                                                                         | Default          |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `nodes`              | array    | **Required**. Specifies the tree nodes and their children.                                                          |                  |
| `checkKeys`          | array    | A list of [keyboard keys][mdn-key] that will trigger a toggle of the check status of a node.                        | `[' ', 'Enter']` |
| `checkModel`         | string   | Specifies which checked nodes should be stored in the `checked` array. Accepts `'leaf'` or `'all'`.                 | `'leaf'`         |
| `checked`            | array    | An array of checked node values.                                                                                    | `[]`             |
| `direction`          | string   | A string that specify whether the direction of the component is left-to-right (`'ltr'`) or right-to-left (`'rtl'`). | `'ltr'`          |
| `disabled`           | bool     | If true, the component will be disabled and nodes cannot be checked.                                                | `false`          |
| `expandDisabled`     | bool     | If true, the ability to expand nodes will be disabled.                                                              | `false`          |
| `expandOnClick`      | bool     | If true, nodes will be expanded by clicking on labels. Requires a non-empty `onClick` function.                     | `false`          |
| `expanded`           | array    | An array of expanded node values.                                                                                   | `[]`             |
| `icons`              | object   | An object containing the mappings for the various icons and their components. See **Changing the Default Icons**.   | `{ ... }`        |
| `iconsClass`         | string   | A string that specifies which icons class to utilize. Currently, `'fa4'` and `'fa5'` are supported.                 | `'fa5'`          |
| `id`                 | string   | A string to be used for the HTML ID of the rendered tree and its nodes.                                             | `null`           |
| `lang`               | object   | A key-value pairing of localized text. See [`src/js/lang/default.js`][lang-file] for a list of keys.                | `{ ... }`        |
| `name`               | string   | Optional name for the hidden `<input>` element.                                                                     | `undefined`      |
| `nameAsArray`        | bool     | If true, the hidden `<input>` will encode its values as an array rather than a joined string.                       | `false`          |
| `nativeCheckboxes`   | bool     | If true, native browser checkboxes will be used instead of pseudo-checkbox icons.                                   | `false`          |
| `noCascade`          | bool     | If true, toggling a parent node will **not** cascade its check state to its children.                               | `false`          |
| `onlyLeafCheckboxes` | bool     | If true, checkboxes will only be shown for leaf nodes.                                                              | `false`          |
| `optimisticToggle`   | bool     | If true, toggling a partially-checked node will select all children. If false, it will deselect.                    | `true`           |
| `showExpandAll`      | bool     | If true, buttons for expanding and collapsing all parent nodes will appear in the tree.                             | `false`          |
| `showNodeIcon`       | bool     | If true, each node will show a parent or leaf icon.                                                                 | `true`           |
| `showNodeTitle`      | bool     | If true, the `label` of each node will become the `title` of the resulting DOM node. Overridden by `node.title`.    | `false`          |
| `onCheck`            | function | onCheck handler: `function(checked, targetNode) {}`                                                                 | `() => {}`       |
| `onClick`            | function | onClick handler: `function(targetNode) {}`. If set, `onClick` will be called when a node's label has been clicked.  | `null`           |
| `onContextMenu`      | function | onContextMenu handler: `function(event, targetNode) {}`. Triggers when right-clicking a node element.               | `null`           |
| `onExpand`           | function | onExpand handler: `function(expanded, targetNode) {}`                                                               | `() => {}`       |

## vscode-ext

Uses:

- https://code.visualstudio.com/api/extension-guides/tree-view
- vscode.TreeItem

````ts
export class TreeItem {
  /**
   * A human-readable string describing this item. When `falsy`, it is derived from {@link TreeItem.resourceUri resourceUri}.
   */
  label?: string | TreeItemLabel;

  /**
   * Optional id for the tree item that has to be unique across tree. The id is used to preserve the selection and expansion state of the tree item.
   *
   * If not provided, an id is generated using the tree item's label. **Note** that when labels change, ids will change and that selection and expansion state cannot be kept stable anymore.
   */
  id?: string;

  /**
   * The icon path or {@link ThemeIcon} for the tree item.
   * When `falsy`, {@link ThemeIcon.Folder Folder Theme Icon} is assigned, if item is collapsible otherwise {@link ThemeIcon.File File Theme Icon}.
   * When a file or folder {@link ThemeIcon} is specified, icon is derived from the current file icon theme for the specified theme icon using {@link TreeItem.resourceUri resourceUri} (if provided).
   */
  iconPath?: string | IconPath;

  /**
   * A human-readable string which is rendered less prominent.
   * When `true`, it is derived from {@link TreeItem.resourceUri resourceUri} and when `falsy`, it is not shown.
   */
  description?: string | boolean;

  /**
   * The {@link Uri} of the resource representing this item.
   *
   * Will be used to derive the {@link TreeItem.label label}, when it is not provided.
   * Will be used to derive the icon from current file icon theme, when {@link TreeItem.iconPath iconPath} has {@link ThemeIcon} value.
   */
  resourceUri?: Uri;

  /**
   * The tooltip text when you hover over this item.
   */
  tooltip?: string | MarkdownString | undefined;

  /**
   * The {@link Command} that should be executed when the tree item is selected.
   *
   * Please use `vscode.open` or `vscode.diff` as command IDs when the tree item is opening
   * something in the editor. Using these commands ensures that the resulting editor will
   * appear consistent with how other built-in trees open editors.
   */
  command?: Command;

  /**
   * {@link TreeItemCollapsibleState} of the tree item.
   */
  collapsibleState?: TreeItemCollapsibleState;

  /**
   * Context value of the tree item. This can be used to contribute item specific actions in the tree.
   * For example, a tree item is given a context value as `folder`. When contributing actions to `view/item/context`
   * using `menus` extension point, you can specify context value for key `viewItem` in `when` expression like `viewItem == folder`.
   * ```json
   * "contributes": {
   *   "menus": {
   *     "view/item/context": [
   *       {
   *         "command": "extension.deleteFolder",
   *         "when": "viewItem == folder"
   *       }
   *     ]
   *   }
   * }
   * ```
   * This will show action `extension.deleteFolder` only for items with `contextValue` is `folder`.
   */
  contextValue?: string;

  /**
   * Accessibility information used when screen reader interacts with this tree item.
   * Generally, a TreeItem has no need to set the `role` of the accessibilityInformation;
   * however, there are cases where a TreeItem is not displayed in a tree-like way where setting the `role` may make sense.
   */
  accessibilityInformation?: AccessibilityInformation;

  /**
   * {@link TreeItemCheckboxState TreeItemCheckboxState} of the tree item.
   * {@link TreeDataProvider.onDidChangeTreeData onDidChangeTreeData} should be fired when {@link TreeItem.checkboxState checkboxState} changes.
   */
  checkboxState?:
    | TreeItemCheckboxState
    | {
        /**
         * The {@link TreeItemCheckboxState} of the tree item
         */
        readonly state: TreeItemCheckboxState;
        /**
         * A tooltip for the checkbox
         */
        readonly tooltip?: string;
        /**
         * Accessibility information used when screen readers interact with this checkbox
         */
        readonly accessibilityInformation?: AccessibilityInformation;
      };

  /**
   * @param label A human-readable string describing this item
   * @param collapsibleState {@link TreeItemCollapsibleState} of the tree item. Default is {@link TreeItemCollapsibleState.None}
   */
  constructor(label: string | TreeItemLabel, collapsibleState?: TreeItemCollapsibleState);

  /**
   * @param resourceUri The {@link Uri} of the resource representing this item.
   * @param collapsibleState {@link TreeItemCollapsibleState} of the tree item. Default is {@link TreeItemCollapsibleState.None}
   */
  constructor(resourceUri: Uri, collapsibleState?: TreeItemCollapsibleState);
}
````

NB this too supports check boxes.

```ts
export interface TreeDataProvider<T> {
  /**
   * An optional event to signal that an element or root has changed.
   * This will trigger the view to update the changed element/root and its children recursively (if shown).
   * To signal that root has changed, do not pass any argument or pass `undefined` or `null`.
   */
  onDidChangeTreeData?: Event<T | T[] | undefined | null | void>;

  /**
   * Get {@link TreeItem} representation of the `element`
   *
   * @param element The element for which {@link TreeItem} representation is asked for.
   * @returns TreeItem representation of the element.
   */
  getTreeItem(element: T): TreeItem | Thenable<TreeItem>;

  /**
   * Get the children of `element` or root if no element is passed.
   *
   * @param element The element from which the provider gets children. Can be `undefined`.
   * @returns Children of `element` or root if no element is passed.
   */
  getChildren(element?: T): ProviderResult<T[]>;

  /**
   * Optional method to return the parent of `element`.
   * Return `null` or `undefined` if `element` is a child of root.
   *
   * **NOTE:** This method should be implemented in order to access {@link TreeView.reveal reveal} API.
   *
   * @param element The element for which the parent has to be returned.
   * @returns Parent of `element`.
   */
  getParent?(element: T): ProviderResult<T>;

  /**
   * Called on hover to resolve the {@link TreeItem.tooltip TreeItem} property if it is undefined.
   * Called on tree item click/open to resolve the {@link TreeItem.command TreeItem} property if it is undefined.
   * Only properties that were undefined can be resolved in `resolveTreeItem`.
   * Functionality may be expanded later to include being called to resolve other missing
   * properties on selection and/or on open.
   *
   * Will only ever be called once per TreeItem.
   *
   * onDidChangeTreeData should not be triggered from within resolveTreeItem.
   *
   * *Note* that this function is called when tree items are already showing in the UI.
   * Because of that, no property that changes the presentation (label, description, etc.)
   * can be changed.
   *
   * @param item Undefined properties of `item` should be set then `item` should be returned.
   * @param element The object associated with the TreeItem.
   * @param token A cancellation token.
   * @returns The resolved tree item or a thenable that resolves to such. It is OK to return the given
   * `item`. When no result is returned, the given `item` will be used.
   */
  resolveTreeItem?(item: TreeItem, element: T, token: CancellationToken): ProviderResult<TreeItem>;
}
```

When the tree is created it calls getChildren(undefined) to get the root nodes.

To update the tree call refresh which is implemented as follows

```ts
class MyTreeDataProvider implements vscode.TreeDataProvider<Node> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<Node | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getChildren(element?: Node) { … }
  getTreeItem(element: Node) { … }
}
```
