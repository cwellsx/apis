import { MenuItem } from "../contracts-app";
import type { AnyOptions } from "../contracts-config";
import { ViewState } from "../types";

export type SelectedView = {
  viewState: ViewState;
  // the options of the view which is selected: the dotnet view's, or the custom view's, read and written through
  options: AnyOptions;
  getMenuItems: () => MenuItem[];
  // return code true means to refresh the menu items
  onMenuItem: (menuItemId: string) => boolean;
  hasParentEdges: boolean;
};
