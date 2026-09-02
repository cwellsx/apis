import type * as Id from "../id2";
import { Sql } from "../sql2";

export type NodeState = { isHidden: boolean; isExpanded: boolean };

const toBoolean = (b: Sql.Boolean): boolean => b == 1;
export const fromBoolean = (b: boolean): Sql.Boolean => (b ? 1 : 0);

export class NodeStates {
  private _states: Map<Id.AnyBigId, NodeState>;

  isExpanded: (id: Id.AnyBigId, isGroup: boolean) => boolean;
  isVisible: (id: Id.AnyBigId) => boolean;

  showsChildren: (id: Id.AnyBigId, isGroup: boolean) => boolean;

  constructor(viewStates: Sql.ViewState[]) {
    this._states = new Map<Id.AnyBigId, NodeState>(
      viewStates.map((viewState) => [
        viewState.id,
        { isHidden: toBoolean(viewState.isHidden), isExpanded: toBoolean(viewState.isExpanded) },
      ])
    );

    // by default, groups are expanded and node are non-expanded
    this.isExpanded = (id: Id.AnyBigId, isGroup: boolean): boolean => this._states.get(id)?.isExpanded ?? isGroup;
    // by default, groups and nodes are visible unless explicitly hidden
    this.isVisible = (id: Id.AnyBigId): boolean => !(this._states.get(id)?.isHidden ?? false);

    this.showsChildren = (id: Id.AnyBigId, isGroup: boolean) => this.isExpanded(id, isGroup) && this.isVisible(id);
  }
}
