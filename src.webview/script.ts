/// <reference path="./ipc.d.ts" />

(function () {
  const vscode = acquireVsCodeApi();

  const postMessage = (message: WebviewEvent): void => vscode.postMessage(message);

  window.addEventListener("message", (event) => {
    const message = event.data as WebviewUpdate;
    if (message.command === "svg") {
      updateSvg(message.svg);
    }
  });

  const updateSvg = (svg: string): void => {
    const div = document.getElementById("svg-container");
    if (!div) throw new Error("No svg-container element");
    div.innerHTML = svg;
  };

  const div = document.getElementById("svg-container");

  if (!div) throw new Error("No svg-container element");

  div.innerHTML = "Hello";

  window.addEventListener("DOMContentLoaded", () => postMessage("ready"));

  div.addEventListener("click", (event) => {
    const target = event.target as SVGElement;
    if (!target) return;
    console.log("Clicked:", target.tagName, target.id);
  });

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
})();
