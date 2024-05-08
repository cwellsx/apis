import { Menu, MenuItemConstructorOptions } from "electron";
import { ViewType } from "../shared-types";
import { insert } from "./shared-types/remove";

export type ViewMenu = {
  viewType: ViewType;
  hasErrors: boolean;
  showViewType: (viewType?: ViewType) => void;
};

export const createMenu = (
  openAssemblies: () => Promise<void>,
  openCustomJson: () => void,
  openCoreJson: () => Promise<void>,
  recent: string[],
  openRecent: (path: string) => Promise<void>,
  viewMenu: ViewMenu | undefined
): void => {
  const recentItems: MenuItemConstructorOptions[] = [];
  if (recent.length) {
    recentItems.push({ type: "separator" });
    recentItems.push(
      ...recent.map((path) => {
        return { label: path, click: async () => await openRecent(path) };
      })
    );
  }
  const menuTemplate: MenuItemConstructorOptions[] = [
    {
      label: "File",
      submenu: [
        {
          label: "Directory containing binary .NET assemblies",
          click: async () => await openAssemblies(),
        },
        {
          label: "JSON file containing `id` and `dependencies`",
          click: openCustomJson,
        },
        {
          label: "Core.json file created by running Core.exe",
          click: async () => await openCoreJson(),
        },
        ...recentItems,
      ],
    },
    {
      label: "Inspect",
      role: "toggleDevTools",
    },
  ];

  if (viewMenu) {
    const submenu: MenuItemConstructorOptions[] = [];

    const create = (label: string, viewType: ViewType): void => {
      const menuItem: MenuItemConstructorOptions = { label, type: "checkbox" };
      if (viewMenu.viewType === viewType) menuItem.checked = true;
      else menuItem.click = async () => viewMenu.showViewType(viewType);
      submenu.push(menuItem);
    };

    create("Assembly references", "references");
    if (viewMenu.hasErrors) create(".NET reflection errors", "errors");

    insert(menuTemplate, 1, { label: "View", submenu });
  }

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
};
