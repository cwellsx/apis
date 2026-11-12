import { MenuItem } from "../contracts-app";
import type { AnyOptions } from "../contracts-config";
import { isDotnetOptions } from "../contracts-config";
import { IdView } from "../id2";
import { SqlCustom } from "../sqlCustom";
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

  const viewState = createCustomViewState(sqlTables, view.id);

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
      return sqlTables.getOptions();
    },
    set options(value: AnyOptions) {
      // the custom view has no options of its own yet, so the only value it can store is the empty one
      assert(!isDotnetOptions(value), "the custom view has no options yet");
      sqlTables.setOptions(value);
    },
    getMenuItems,
    onMenuItem,
    hasParentEdges: true,
  };
};
