import { MenuItem } from "../contracts-app";
import { ViewState } from "../types";

export type SelectedView = {
  viewState: ViewState;
  getMenuItems: () => MenuItem[];
  // return code true means to refresh the menu items
  onMenuItem: (menuItemId: string) => boolean;
};
