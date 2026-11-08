// a view id is stored as text in the UI and as a number in SQLite
import { castViewId } from "./idCast";
import type * as Id from "./idTypes";

export const textToViewId = (id: string | undefined): Id.ViewId | undefined =>
  id ? castViewId(Number(id)) : undefined;
export const viewIdToText = (id: Id.ViewId): string => id.toString();
export const minViewId = (ids: Id.ViewId[]): Id.ViewId => castViewId(Math.min(...ids));