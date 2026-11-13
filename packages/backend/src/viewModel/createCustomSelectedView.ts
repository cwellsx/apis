import { MenuItem } from "../contracts-app";
import type { AnyOptions, CustomOptions } from "../contracts-config";
import { isDotnetOptions } from "../contracts-config";
import { IdView } from "../id2";
import { SqlCustom } from "../sqlCustom";
import type { ViewState } from "../types";
import { assert } from "../utils";
import { createCustomViewState } from "../viewState";
import { SelectedView } from "./selectedView";

export const createCustomSelectedView = (sqlTables: SqlCustom.Tables): SelectedView => {
  const initialView = (): SqlCustom.View => {
    const viewId = sqlTables.config.getViewId() ?? IdView.minViewId(sqlTables.views.selectAll().map((view) => view.id));
    const view = sqlTables.views.selectOne({ id: viewId });
    assert(!!view);
    return view;
  };

  const view = initialView();

  // the options are held here as the view state is, and not read again for every get
  let options: CustomOptions = sqlTables.getOptions();

  // Called again whenever the view state has to be rebuilt, which here is when the options change: the custom
  // view has no menu of views to select another view.id from.
  const createViewState = (): ViewState => createCustomViewState(sqlTables, view.id, options);

  let viewState = createViewState();

  const onReset = (): void => {
    viewState.resetNodeStates();
  };

  const onMenuItem = (menuItemId: string): boolean => {
    switch (menuItemId) {
      case "reset":
        onReset();
        break;
    }
    return false;
  };

  const getMenuItems = (): MenuItem[] => [{ type: "normal", label: "Reset", menuItemId: "reset" }];

  return {
    viewState,
    get options(): AnyOptions {
      return options;
    },
    set options(value: AnyOptions) {
      // the custom view has no options of its own yet, so the only value it can store is the empty one
      assert(!isDotnetOptions(value), "the custom view has no options yet");
      sqlTables.setOptions(value);
      // read back what was stored, then rebuild the view state, which is where the options are used
      options = sqlTables.getOptions();
      viewState = createViewState();
    },
    getMenuItems,
    onMenuItem,
    hasParentEdges: true,
  };
};
