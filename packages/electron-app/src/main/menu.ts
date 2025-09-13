import { BrowserWindow, Menu, MenuItemConstructorOptions } from "electron";
import { ViewType } from "../shared-types";

export type ViewMenuItem = { label: string; viewType: ViewType };

export type ViewMenu = {
  menuItems: ViewMenuItem[];
  currentViewType: ViewType | undefined;
  showViewType: (viewType: ViewType) => void;
};

export type SetViewMenu = (viewMenu: ViewMenu) => void;

const getFileSubmenu = (
  openAssemblies: () => Promise<void>,
  openCustomJson: () => Promise<void>,
  openCoreJson: () => Promise<void>,
  resetViewMenu: () => void,
  updateRecent: () => void
): MenuItemConstructorOptions[] => [
  {
    label: "Directory containing binary .NET assemblies",
    click: async () => {
      resetViewMenu();
      await openAssemblies();
      updateRecent();
    },
  },
  {
    label: "JSON file containing `id` and `dependencies`",
    click: async () => {
      resetViewMenu();
      await openCustomJson();
      updateRecent();
    },
  },
  {
    label: "Core.json file created by running Core.exe",
    click: async () => {
      resetViewMenu();
      await openCoreJson();
      updateRecent();
    },
  },
];

const getRecentSubmenu = (
  recent: string[],
  openRecent: (path: string) => Promise<void>,
  resetViewMenu: () => void,
  updateRecent: () => void
): MenuItemConstructorOptions[] =>
  recent.map((path) => ({
    label: path,
    click: async () => {
      resetViewMenu();
      await openRecent(path);
      updateRecent();
    },
  }));

const getViewSubmenu = (
  menuItems: ViewMenuItem[],
  currentViewType: ViewType | undefined,
  showViewType: (viewType: ViewType) => void
): MenuItemConstructorOptions[] =>
  menuItems.map(({ label, viewType }) => ({
    label,
    type: "checkbox",
    checked: viewType === currentViewType,
    click: viewType === currentViewType ? undefined : async () => showViewType(viewType),
  }));

const getMenu = (
  fileSubmenu: MenuItemConstructorOptions[],
  recentSubmenu: MenuItemConstructorOptions[],
  viewSubmenu?: MenuItemConstructorOptions[]
): MenuItemConstructorOptions[] => [
  {
    label: "File",
    submenu: !recentSubmenu.length ? fileSubmenu : [...fileSubmenu, { type: "separator" }, ...recentSubmenu],
  },
  {
    label: "View",
    submenu: viewSubmenu,
  },
  {
    label: "Inspect",
    role: "toggleDevTools",
  },
];

export const createSecondMenu = (window: BrowserWindow): { setViewMenu: SetViewMenu } => {
  const menu = Menu.buildFromTemplate([
    {
      label: "Inspect",
      role: "toggleDevTools",
    },
  ]);
  window.setMenu(menu);
  const setViewMenu: SetViewMenu = () => {
    // do nothing
  };
  return { setViewMenu };
};

export const createAppMenu = (
  window: BrowserWindow,
  openAssemblies: () => Promise<void>,
  openCustomJson: () => Promise<void>,
  openCoreJson: () => Promise<void>,
  openRecent: (path: string) => Promise<void>,
  getRecent: () => string[]
): { setViewMenu: SetViewMenu } => {
  // could call getRecent() every time we need it, but it's a database select so might as well cache it
  let recent = getRecent();

  // need to cache this because recent is updated after the viewMenu
  let viewSubmenu: MenuItemConstructorOptions[] | undefined = undefined;

  const setMenu = (): void => {
    const recentSubmenu = getRecentSubmenu(recent, openRecent, resetViewMenu, updateRecent);
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

  // these items never change
  const fileSubmenu = getFileSubmenu(openAssemblies, openCustomJson, openCoreJson, resetViewMenu, updateRecent);

  const setViewMenu: SetViewMenu = (viewMenu: ViewMenu) => {
    const { menuItems, currentViewType, showViewType } = viewMenu;
    const setViewType = (viewType: ViewType) => {
      // update the view
      showViewType(viewType);
      // update this menu
      editMenu(viewType);
    };
    const editMenu = (viewType: ViewType | undefined): void => {
      viewSubmenu = getViewSubmenu(menuItems, viewType, setViewType);
      setMenu();
    };
    editMenu(currentViewType);
  };

  setMenu();

  return { setViewMenu };
};
