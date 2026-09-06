// the application can map this to vscode.QuickPickItem properties and/or Electron.MenuItemConstructorOptions
export type OnClick = () => Promise<void>;

export type MenuItem =
  | { type: "radio"; label: string; picked: boolean; onClick: OnClick }
  | { type: "separator" }
  | { type: "normal"; label: string; onClick: OnClick };

// this sets menu item contents, can be called more than once e.g. after a change to the picked property
export type SetMenuItems = (menuItems: MenuItem[]) => void;
