import { zooms } from "backend-config";
import * as React from "react";
import { log } from "./log";

export type OnWheel = (event: React.WheelEvent) => void;

export function useZoomPercent(zoomPercent: number, setZoomPercent: (zoomPercent: number) => void): OnWheel {
  const onWheel = (event: React.WheelEvent): void => {
    // I tried `const delta = event.deltaY * -0.01`
    // like the example at https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event
    // however exact value of event.deltaY is unreliable, sometimes 100 or -100, sometimes e.g. -91.28
    const delta = -Math.sign(event.deltaY);
    const index = Math.max(Math.min(zooms.indexOf(zoomPercent) + delta, zooms.length - 1), 0);
    log("onWheel", zooms[index]);
    setZoomPercent(zooms[index]);
  };
  return onWheel;
}

export function useFontSize(fontSize: number, setFontSize: (fontSize: number) => void): OnWheel {
  const onWheel = (event: React.WheelEvent): void => {
    if (!event.ctrlKey) return;
    const min = 5;
    const max = 18;
    const delta = -Math.sign(event.deltaY);
    const newFontSize = Math.max(Math.min(Math.round(fontSize) + delta, max), min);
    setFontSize(newFontSize);
  };
  return onWheel;
}
