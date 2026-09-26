/*

Avoid this error

    ../../node_modules/@viz-js/viz/types/index.d.ts:69:69 - error TS2304: Cannot find name 'SVGSVGElement'.
    69   renderSVGElement(input: string | Graph, options?: RenderOptions): SVGSVGElement

Alternatively could include the DOM lib in tsconfig but the backend should build without requiring the DOM.

*/

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface SVGSVGElement {}
}
export {};
