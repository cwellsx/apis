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

  const divId = "svg-container"; // must match the id in webview.html

  const updateSvg = (svg: string): void => {
    const divElement = document.getElementById(divId);
    if (!divElement) throw new Error("No #svg-container element");
    divElement.innerHTML = svg;
    const svgElement = divElement.querySelector("svg");
    if (!svgElement) throw new Error("No <svg> element");
    enableSvgHoverInteractivity(svgElement);
    addEventListeners(svgElement);
  };

  const enableSvgHoverInteractivity = (svgElement: SVGSVGElement) => {
    const interactiveTags = [
      "path",
      "polygon",
      "rect",
      "circle",
      "ellipse",
      "line",
      "polyline",
      "g",
    ];

    svgElement.querySelectorAll(interactiveTags.join(",")).forEach((el) => {
      if (!(el instanceof SVGElement)) return;

      // Ensure full-area interactivity
      el.setAttribute("pointer-events", "all");

      // Changing the fill from "none" to transparent can also help with interactivity
      // but with pointer-events: all it is not necessary
    });
  };

  const addEventListeners = (svgElement: SVGElement): void => {
    const getTarget = (event: MouseEvent): SVGElement | null => {
      const target = event.target as SVGElement;
      if (!target) return null;
      if (target.tagName === "svg") return null; // or could specify if (target === svgElement)
      return target;
    };

    svgElement.addEventListener("click", (event) => {
      const target = getTarget(event);
      if (!target) return;
      postMessage({ type: "click", id: target.id });
      console.log("Clicked:", target.tagName, target.id);
    });

    svgElement.addEventListener("mouseover", (event) => {
      const target = getTarget(event);
      if (!target) return;
      target.setAttribute("stroke", "red"); // highlight
      console.log("Hovered over:", target.tagName, target.id);
    });

    svgElement.addEventListener("mouseout", (event) => {
      const target = getTarget(event);
      if (!target) return;
      target.setAttribute("stroke", "black"); // reset
    });
  };

  const div = document.getElementById("svg-container");

  if (!div) throw new Error("No svg-container element");

  div.innerHTML = "Hello";

  window.addEventListener("DOMContentLoaded", () => postMessage("ready"));
})();
