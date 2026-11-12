import { MenuItem } from "../contracts-app";
import type { AnyOptions } from "../contracts-config";
import { isDotnetOptions } from "../contracts-config";
import { IdView } from "../id2";
import { Sql } from "../sql2";
import type { ViewState } from "../types";
import { assert } from "../utils";
import { createViewState } from "../viewState";
import { SelectedView } from "./selectedView";

export const createDotnetSelectedView = (sqlTables: Sql.Tables): SelectedView => {
  const initialView = (): Sql.View => {
    const viewId = sqlTables.config.getViewId() ?? IdView.minViewId(sqlTables.views.selectAll().map((view) => view.id));
    const view = sqlTables.views.selectOne({ id: viewId });
    assert(!!view);
    return view;
  };

  const selectedViewState = (): ViewState => createViewState(sqlTables, view.viewType, view.id);

  let view = initialView();
  let viewState = selectedViewState();

  const onReset = (): void => {
    viewState.resetNodeStates();
  };

  const onMenuItem = (menuItemId: string): boolean => {
    switch (menuItemId) {
      case "reset":
        onReset();
        return false;
    }
    const prefix = "view|";
    if (menuItemId.startsWith(prefix)) {
      const viewId = IdView.textToViewId(menuItemId.slice(prefix.length));
      assert(!!viewId);
      sqlTables.config.setViewId(viewId);
      view = initialView();
      viewState = selectedViewState();
    }
    return true;
  };

  const getSetViewType = (candidate: Sql.View): MenuItem => ({
    type: "radio",
    label: candidate.viewName,
    picked: candidate.id == view.id,
    menuItemId: `view|${candidate.id}`,
  });

  const getMenuItems = (): MenuItem[] => [
    ...sqlTables.views.selectAll().map((candidate) => getSetViewType(candidate)),
    { type: "separator" },
    { type: "separator" },
    { type: "normal", label: "Reset", menuItemId: "reset" },
  ];

  const selectedView: SelectedView = {
    get viewState() {
      return viewState;
    },
    set viewState(next: ViewState) {
      viewState = next;
    },
    get options(): AnyOptions {
      return sqlTables.getOptions();
    },
    set options(value: AnyOptions) {
      assert(isDotnetOptions(value), "the dotnet view's options are the dotnet options");
      sqlTables.setOptions(value);
    },
    getMenuItems,
    onMenuItem,
    hasParentEdges: false,
  };

  return selectedView;
};
