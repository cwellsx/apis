import { MenuItem, SetMenuItems } from "../contracts-app";
import { minViewId } from "../id2";
import { Sql } from "../sql2";
import { assert } from "../utils";
import { createViewState, ViewState } from "../viewState";
import { SelectedView } from "./selectedView";

export class DotnetSelectedView implements SelectedView {
  private view: Sql.View;
  viewState: ViewState;
  onChanged: () => Promise<void>;

  constructor(sqlTables: Sql.Tables, setMenuItems: SetMenuItems) {
    const initialView = (): Sql.View => {
      const viewId = sqlTables.config.getViewId() ?? minViewId(sqlTables.views.selectAll().map((view) => view.id));
      const view = sqlTables.views.selectOne({ id: viewId });
      assert(!!view);
      return view;
    };

    const selectedViewState = () => createViewState(sqlTables, this.view.viewType, this.view.id);

    const createMenuItems = (): void => {
      const onSetViewType = (view: Sql.View): Promise<void> => {
        sqlTables.config.setViewId(view.id);
        this.view = view;
        this.viewState = selectedViewState();
        createMenuItems();
        return this.onChanged();
      };

      const onReset = (): Promise<void> => {
        this.viewState.resetNodeStates();
        return this.onChanged();
      };

      const getSetViewType = (view: Sql.View): MenuItem => ({
        type: "radio",
        label: view.viewName,
        picked: view.id == this.view.id,
        onClick: () => onSetViewType(view),
      });

      setMenuItems([
        ...sqlTables.views.selectAll().map((view) => getSetViewType(view)),
        { type: "separator" },
        { type: "separator" },
        { type: "normal", label: "Reset", onClick: onReset },
      ]);
    };

    // initially null until createMainApi installs showViewType
    this.onChanged = () => Promise.resolve();

    this.view = initialView();
    this.viewState = selectedViewState();
    createMenuItems();
  }
}
