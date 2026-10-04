import { ViewState } from "../viewState";

export type SelectedView = { viewState: ViewState; onChanged: () => Promise<void> };
