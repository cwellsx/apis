// this defines shared types which are used in the IPC between the extension and the webview
// it is imported by both src/webview.ts and src.webview/script.ts

type WebviewEventReady = "ready";
type WebviewEventClick = { type: "click"; id: string };

type WebviewEvent = WebviewEventReady | WebviewEventClick;

type WebviewUpdate = { command: "svg"; svg: string };
