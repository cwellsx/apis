import { MenuItem } from "../contracts-app";
import type { AnyOptions, DotnetOptions } from "../contracts-config";
import { isDotnetOptions } from "../contracts-config";
import { IdView } from "../id2";
import { Sql } from "../sql2";
import type { ViewState } from "../types";
import { assert } from "../utils";
import { createDotnetViewState } from "../viewState";
import { SelectedView } from "./selectedView";

export const createDotnetSelectedView = (sqlTables: Sql.Tables): SelectedView => {
  const initialView = (): Sql.View => {
    const viewId = sqlTables.config.getViewId() ?? IdView.minViewId(sqlTables.views.selectAll().map((view) => view.id));
    const view = sqlTables.views.selectOne({ id: viewId });
    assert(!!view);
    return view;
  };

  // the options are held here as the view state is, and not read again for every get
  let options: DotnetOptions = sqlTables.getOptions();

  // Called again whenever the view state has to be rebuilt: when the options change, and when a different
  // view.id is selected from the menu.
  const createViewState = (): ViewState => createDotnetViewState(sqlTables, view.viewType, view.id, options);

  let view = initialView();
  let viewState = createViewState();

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
      viewState = createViewState();
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
      return options;
    },
    set options(value: AnyOptions) {
      assert(isDotnetOptions(value), "the dotnet view's options are the dotnet options");
      sqlTables.setOptions(value);
      // read back what was stored, then rebuild the view state, which is where the options are used
      options = sqlTables.getOptions();
      viewState = createViewState();
    },
    getMenuItems,
    onMenuItem,
    hasParentEdges: false,
  };

  return selectedView;
};
