import { SetMenuItems } from "../contracts-app";
import { AnyView } from "../contracts-ui";
import { minViewId } from "../id2";
import { SqlCustom } from "../sqlCustom";
import { assert } from "../utils";
import { createCustomViewState, ViewState } from "../viewState";
import { SelectedView } from "./selectedView";

export class CustomSelectedView implements SelectedView {
  private view: SqlCustom.View;
  viewState: ViewState;
  onChanged: () => Promise<AnyView[]>;

  constructor(sqlTables: SqlCustom.Tables, setMenuItems: SetMenuItems) {
    const initialView = (): SqlCustom.View => {
      const viewId = sqlTables.config.getViewId() ?? minViewId(sqlTables.views.selectAll().map((view) => view.id));
      const view = sqlTables.views.selectOne({ id: viewId });
      assert(!!view);
      return view;
    };

    const selectedViewState = () => createCustomViewState(sqlTables, this.view.id);

    const createMenuItems = (): void => {
      const onReset = (): Promise<AnyView[]> => {
        this.viewState.resetNodeStates();
        return this.onChanged();
      };

      setMenuItems([{ type: "normal", label: "Reset", onClick: onReset }]);
    };

    // initially null until createMainApi installs showViewType
    this.onChanged = () => Promise.resolve([]);

    this.view = initialView();
    this.viewState = selectedViewState();
    createMenuItems();
  }
}
