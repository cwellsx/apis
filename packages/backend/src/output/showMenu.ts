import { ViewMenuItem } from "../contracts-app";
import { ViewType } from "../contracts-ui";
import { getOrThrow } from "../utils";
import { MenuViewTypes } from "./types";

export type ViewTypeData = { menuLabel: string; title: string; showViewType: () => Promise<void> };
export type KVP = [ViewType, ViewTypeData];

type ViewState = { viewType: ViewType };

type ShowViewType = { showViewType: () => Promise<void> };

export const showMenu = (
  kvps: KVP[],
  isEnabled: (viewType: ViewType) => boolean,
  viewState: ViewState,
  setTitle: (title: string) => void
): [ShowViewType, MenuViewTypes] => {
  const map = new Map<ViewType, ViewTypeData>(kvps);

  const viewMenuItems = (): ViewMenuItem[] => {
    const result: ViewMenuItem[] = [];
    for (const [viewType, viewTypeData] of map) {
      if (!isEnabled(viewType)) continue;
      const { menuLabel } = viewTypeData;
      result.push({ viewType, menuLabel });
    }
    return result;
  };

  const getData = (): ViewTypeData => getOrThrow(map, currentViewType());

  const currentViewType = (): ViewType => viewState.viewType;

  const showViewType = (): Promise<void> => getData().showViewType();

  const showTitle = (): void => setTitle(getData().title);

  const changeViewType = (newViewType: ViewType): Promise<void> => {
    viewState.viewType = newViewType;
    showTitle();
    return showViewType();
  };

  return [{ showViewType }, { currentViewType, viewMenuItems, changeViewType, showTitle }];
};
