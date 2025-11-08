import { ViewType } from "../ui";

export type ViewMenuItem = { label: string; viewType: ViewType };

export type ViewMenu = {
  menuItems: ViewMenuItem[];
  currentViewType: ViewType;
  showViewType: (viewType: ViewType) => Promise<void>;
};

export type SetViewMenu = (viewMenu: ViewMenu) => void;
