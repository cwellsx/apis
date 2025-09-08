// this defines shared types which are used in the IPC between the extension and the webview
// it is imported by both src/webview.ts and src.webview/script.ts

type WebviewEvent = "ready";
type WebviewUpdate = { command: "svg"; svg: string };
