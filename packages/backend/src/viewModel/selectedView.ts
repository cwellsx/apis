import { AnyView } from "../contracts-ui";
import { ViewState } from "../viewState";

export type SelectedView = { viewState: ViewState; onChanged: () => Promise<AnyView[]> };
