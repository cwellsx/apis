import { ViewType } from "../ui";

export type ViewMenuItem = { label: string; viewType: ViewType };

export type ViewMenu = {
  menuItems: ViewMenuItem[];
  currentViewType: ViewType | undefined;
  showViewType: (viewType: ViewType) => Promise<void>;
};

export type SetViewMenu = (viewMenu: ViewMenu) => void;
