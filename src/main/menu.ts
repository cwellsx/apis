import { Menu, MenuItemConstructorOptions } from "electron";

export const createMenu = (openAssemblies: () => Promise<void>, openCustomJson: () => void): void => {
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
      ],
    },
    {
      label: "Inspect",
      role: "toggleDevTools",
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
};
