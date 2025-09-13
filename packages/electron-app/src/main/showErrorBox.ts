import { dialog } from "electron";

export function showErrorBox(title: string, content: string) {
  dialog.showErrorBox(title, content);
}
