import { BrowserWindow, Menu, MenuItemConstructorOptions } from "electron";
import { ViewType } from "../shared-types";
import { createDisplay } from "./show";

export type ViewMenuItem = { label: string; viewType: ViewType };

export type ViewMenu = {
  menuItems: ViewMenuItem[];
  currentViewType: ViewType | undefined;
  showViewType: (viewType: ViewType) => Promise<void>;
};

export type SetViewMenu = (viewMenu: ViewMenu) => void;

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
  // this creates and assigns the menu and returns a setView<enu to update the View submenu
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

  const display = createDisplay(window);

  const invoke = (func: () => Promise<void>): (() => void) => {
    return () => {
      resetViewMenu();
      func()
        .then(() => {
          updateRecent();
        })
        .catch((error) => {
          display.showException(error);
        });
    };
  };

  // these items never change
  const fileSubmenu: MenuItemConstructorOptions[] = [
    {
      label: "Directory containing binary .NET assemblies",
      click: invoke(openAssemblies),
    },
    {
      label: "JSON file containing `id` and `dependencies`",
      click: invoke(openCustomJson),
    },
    {
      label: "Core.json file created by running Core.exe",
      click: invoke(openCoreJson),
    },
  ];

  const getRecentSubmenu = (): MenuItemConstructorOptions[] =>
    recent.map((path) => ({
      label: path,
      click: invoke(async () => openRecent(path)),
    }));

  const setViewMenu: SetViewMenu = (viewMenu: ViewMenu) => {
    const { menuItems, currentViewType, showViewType } = viewMenu;
    const setViewType = async (newViewType: ViewType) => {
      // update the view
      await showViewType(newViewType);
      // update this menu
      editMenu(newViewType);
    };
    const editMenu = (newViewType: ViewType | undefined): void => {
      //viewSubmenu = getViewSubmenu(menuItems, viewType, setViewType);
      viewSubmenu = menuItems.map(({ label, viewType }) => ({
        label,
        type: "checkbox",
        checked: viewType === newViewType,
        click:
          viewType === newViewType
            ? undefined
            : () => setViewType(viewType).catch((error) => display.showException(error)),
      }));
      setMenu();
    };
    editMenu(currentViewType);
  };

  setMenu();

  return { setViewMenu };
};
