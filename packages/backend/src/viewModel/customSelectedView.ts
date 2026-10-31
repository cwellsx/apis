import { MenuItem } from "../contracts-app";
import { minViewId } from "../id2";
import { SqlCustom } from "../sqlCustom";
import { assert } from "../utils";
import { createCustomViewState, ViewState } from "../viewState";
import { SelectedView } from "./selectedView";

export class CustomSelectedView implements SelectedView {
  private view: SqlCustom.View;
  viewState: ViewState;
  getMenuItems: () => MenuItem[];
  onMenuItem: (menuItemId: string) => boolean;

  constructor(sqlTables: SqlCustom.Tables) {
    const initialView = (): SqlCustom.View => {
      const viewId = sqlTables.config.getViewId() ?? minViewId(sqlTables.views.selectAll().map((view) => view.id));
      const view = sqlTables.views.selectOne({ id: viewId });
      assert(!!view);
      return view;
    };

    const onReset = (): void => {
      this.viewState.resetNodeStates();
    };

    const onMenuItem = (menuItemId: string): boolean => {
      switch (menuItemId) {
        case "reset":
          onReset();
          break;
      }
      return false;
    };

    this.view = initialView();
    this.viewState = createCustomViewState(sqlTables, this.view.id);
    this.getMenuItems = () => [{ type: "normal", label: "Reset", menuItemId: "reset" }];
    this.onMenuItem = onMenuItem;
  }
}
