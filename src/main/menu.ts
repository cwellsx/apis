import { Menu, MenuItemConstructorOptions } from "electron";

export const createMenu = (
  openAssemblies: () => Promise<void>,
  openCustomJson: () => void,
  openCoreJson: () => Promise<void>
): void => {
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
