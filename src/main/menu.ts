import { Menu, MenuItemConstructorOptions } from "electron";

export const createMenu = (
  openAssemblies: () => Promise<void>,
  openCustomJson: () => void,
  openCoreJson: () => Promise<void>,
  recent: string[],
  openRecent: (path: string) => Promise<void>
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

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
};
