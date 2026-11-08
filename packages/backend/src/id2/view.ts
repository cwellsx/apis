// a view id is stored as text in the UI and as a number in SQLite
import { castViewId } from "./cast";
import type * as Id from "./types";

export const textToViewId = (id: string | undefined): Id.ViewId | undefined =>
  id ? castViewId(Number(id)) : undefined;
export const viewIdToText = (id: Id.ViewId): string => id.toString();
export const minViewId = (ids: Id.ViewId[]): Id.ViewId => castViewId(Math.min(...ids));
