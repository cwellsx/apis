// this is a subset of the vscode.QuickPickItem properties
export type MenuItem = { label: string; picked: boolean };

export type OnMenuItem = (selected: MenuItem) => Promise<void>;

export type SetMenuItems = (
  // this sets menu item contents, can be called more than once e.g. after a change to the picked property
  menuItems: MenuItem[],
  // callback when the user selects an item
  onMenuItem: OnMenuItem
) => void;
