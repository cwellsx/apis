import { MenuItem, OnMenuItem, SetMenuItems } from "backend-app";
import { BrowserWindow, Menu, MenuItemConstructorOptions } from "electron";
import { showException } from "./show";

const getMenu = (
  fileSubmenu: MenuItemConstructorOptions[],
  recentSubmenu: MenuItemConstructorOptions[],
  viewSubmenu?: MenuItemConstructorOptions[]
): MenuItemConstructorOptions[] => [
  {
    label: "File",
    submenu: !recentSubmenu.length ? fileSubmenu : [...fileSubmenu, { type: "separator" }, ...recentSubmenu],
  },
  { label: "View", submenu: viewSubmenu },
  { label: "Inspect", role: "toggleDevTools" },
];

export const createAppMenu = (
  window: BrowserWindow,
  openAssemblies: () => Promise<void>,
  openCustomJson: () => Promise<void>,
  openCoreJson: () => Promise<void>,
  openRecent: (path: string) => Promise<void>,
  getRecent: () => string[]
): SetMenuItems => {
  // this creates and assigns the menu and returns a setViewMenu to update the View submenu
  // could call getRecent() every time we need it, but it's a database select so might as well cache it
  let recent = getRecent();

  // need to cache this because recent is updated after the viewMenu
  let viewSubmenu: MenuItemConstructorOptions[] | undefined = undefined;

  const setMenu = (): void => {
    const recentSubmenu = getRecentSubmenu();
    const menuTemplate = getMenu(fileSubmenu, recentSubmenu, viewSubmenu);
    const menu = Menu.buildFromTemplate(menuTemplate);
    window.setMenu(menu);
  };

  const resetViewMenu = (): void => (viewSubmenu = undefined);

  // could pass this to the application, but the only way to open a DataSource is via a menu
  // so instead call updateRecent implicitly/internally when any File submenu item is clicked
  const updateRecent = (): void => {
    recent = getRecent();
    setMenu();
  };

  const invoke = (func: () => Promise<void>): (() => void) => {
    return () => {
      resetViewMenu();
      func()
        .then(() => {
          updateRecent();
        })
        .catch((error) => {
          showException(window, error);
        });
    };
  };

  // these items never change
  const fileSubmenu: MenuItemConstructorOptions[] = [
    { label: "Directory containing binary .NET assemblies", click: invoke(openAssemblies) },
    { label: "JSON file containing `id` and `dependencies`", click: invoke(openCustomJson) },
    { label: "Core.json file created by running Core.exe", click: invoke(openCoreJson) },
  ];

  const getRecentSubmenu = (): MenuItemConstructorOptions[] =>
    recent.map((path) => ({ label: path, click: invoke(async () => openRecent(path)) }));

  const setMenuItems: SetMenuItems = (menuItems: MenuItem[], onMenuItem: OnMenuItem): void => {
    viewSubmenu = menuItems.map((menuItem) => ({
      label: menuItem.label,
      type: "checkbox",
      checked: menuItem.picked,
      click: () => onMenuItem(menuItem).catch((error) => showException(window, error)),
    }));
    setMenu();
  };

  setMenu();

  return setMenuItems;
};
