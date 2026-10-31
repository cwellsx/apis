import { MenuItem } from "../contracts-app";
import * as Id from "../id2";
import { minViewId } from "../id2";
import { Sql } from "../sql2";
import { assert } from "../utils";
import { createViewState, ViewState } from "../viewState";
import { SelectedView } from "./selectedView";

export class DotnetSelectedView implements SelectedView {
  private view: Sql.View;
  viewState: ViewState;
  getMenuItems: () => MenuItem[];
  onMenuItem: (menuItemId: string) => boolean;

  constructor(sqlTables: Sql.Tables) {
    const initialView = (): Sql.View => {
      const viewId = sqlTables.config.getViewId() ?? minViewId(sqlTables.views.selectAll().map((view) => view.id));
      const view = sqlTables.views.selectOne({ id: viewId });
      assert(!!view);
      return view;
    };

    const selectedViewState = () => createViewState(sqlTables, this.view.viewType, this.view.id);

    const onReset = (): void => {
      this.viewState.resetNodeStates();
    };

    const onMenuItem = (menuItemId: string): boolean => {
      switch (menuItemId) {
        case "reset":
          onReset();
          return false;
      }
      const prefix = "view|";
      if (menuItemId.startsWith(prefix)) {
        const viewId = Id.textToViewId(menuItemId.slice(prefix.length));
        assert(!!viewId);
        sqlTables.config.setViewId(viewId);
        this.view = initialView();
        this.viewState = selectedViewState();
      }
      return true;
    };

    const getSetViewType = (view: Sql.View): MenuItem => ({
      type: "radio",
      label: view.viewName,
      picked: view.id == this.view.id,
      menuItemId: `view|${view.id}`,
    });

    const getMenuItems = (): MenuItem[] => [
      ...sqlTables.views.selectAll().map((view) => getSetViewType(view)),
      { type: "separator" },
      { type: "separator" },
      { type: "normal", label: "Reset", menuItemId: "reset" },
    ];

    this.view = initialView();
    this.viewState = selectedViewState();
    this.getMenuItems = getMenuItems;
    this.onMenuItem = onMenuItem;
  }
}
