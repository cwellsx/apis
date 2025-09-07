// index.ts
//declare const acquireVsCodeApi: any;
//declare function acquireVsCodeApi<StateType = unknown>(): WebviewApi<StateType>;

const vscode = acquireVsCodeApi();

const div = document.getElementById("svg-container");

if (!div) throw new Error("No svg-container element");

div.innerHTML = "Hello";

// function handleClick(event: MouseEvent) {
//   const clickedElement = event.target as HTMLElement;
//   if (!clickedElement) return;

//   console.log("Clicked:", clickedElement.tagName, clickedElement.id);
// }

// document.addEventListener("click", (event) => {
//   console.log("Clicked:", event.target);
// });

// const poly = document.getElementById("poly");
// if (poly) {
//   poly.addEventListener("mouseover", () => {
//     poly.setAttribute("stroke", "red");
//   });
//   poly.addEventListener("mouseout", () => {
//     poly.setAttribute("stroke", "black");
//   });
// }

// const svg = document.getElementById("poly");
// if (svg) {
//   svg.addEventListener("mouseover", (event) => {
//     const el = event.target as HTMLElement;
//     if (!el) return;

//     if (el.tagName === "polygon" || el.tagName === "rect") {
//       el.setAttribute("stroke", "red");
//     }
//   });

//   svg.addEventListener("mouseout", (event) => {
//     const el = event.target as HTMLElement;
//     if (!el) return;

//     if (el.tagName === "polygon" || el.tagName === "rect") {
//       el.setAttribute("stroke", "black");
//     }
//   });
