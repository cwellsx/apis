import { Menu, MenuItemConstructorOptions } from "electron";
import { ViewType } from "../shared-types";
import { insert } from "./shared-types/remove";

export type ViewMenu = {
  hasErrors: boolean;
  getViewType: () => ViewType | undefined;
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

  const currentViewType = viewMenu?.getViewType();
  if (viewMenu && currentViewType) {
    const submenu: MenuItemConstructorOptions[] = [];

    const create = (label: string, viewType: ViewType): void => {
      const menuItem: MenuItemConstructorOptions = { label, type: "checkbox" };
      if (currentViewType === viewType) {
        menuItem.checked = true;
        menuItem.click = undefined;
      } else {
        menuItem.checked = false;
        menuItem.click = async () => viewMenu.showViewType(viewType);
      }
      submenu.push(menuItem);
    };

    create("Assembly references", "references");
    create("APIs", "apis");
    if (viewMenu.hasErrors) create(".NET reflection errors", "errors");

    insert(menuTemplate, 1, { label: "View", submenu });
  }

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
};
