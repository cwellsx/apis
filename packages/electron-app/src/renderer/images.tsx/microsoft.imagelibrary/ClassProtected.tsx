import * as React from "react";
import type { SVGProps } from "react";
const SvgClassProtected = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" {...props}>
    <defs>
      <style>{".ClassProtected_svg__canvas{fill:none;opacity:0}"}</style>
    </defs>
    <g id="ClassProtected_svg__level-1">
      <path
        d="m13.844 13.07.426 2.488-2.234-1.175L9.8 15.558l.427-2.488-1.807-1.762 2.5-.363 1.118-2.264 1.117 2.264 2.5.363Z"
        style={{
          fill: "#212121",
          opacity: 0.1,
        }}
      />
      <path
        d="m16 11.666-.276-.853-2.239-.326-1-2.028h-.9l-1 2.028-2.238.326-.277.853 1.62 1.578-.382 2.229.725.527 2-1.053 2 1.053.726-.527-.383-2.229Zm-2.394 2.978-1.337-.7H11.8l-1.339.7.256-1.49-.145-.443-1.078-1.055 1.5-.217.376-.273.67-1.356.669 1.356.376.273 1.5.217-1.085 1.055-.144.443Z"
        style={{
          fill: "#212121",
          opacity: 1,
        }}
      />
      <path
        d="m5.5 1.5 2 2-4 4-2-2Zm6 3-2 2L11 8l2-2Z"
        style={{
          fill: "#996f00",
          opacity: 0.1,
        }}
      />
      <path
        d="m7 10.5.3.3.288-.887.412-.06V6h1.293l-.147.146v.708l1.419 1.418.4-.813h1.281l1.106-1.1v-.713l-1.5-1.5h-.708L10.293 5H6.707l1.147-1.146v-.708l-2-2h-.708l-4 4v.708l2 2h.708L5.707 6H7Zm4.5-5.293.793.793L11 7.293l-.793-.793Zm-8 1.586L2.207 5.5 5.5 2.207 6.793 3.5Z"
        style={{
          fill: "#996f00",
          opacity: 1,
        }}
      />
    </g>
  </svg>
);
export default SvgClassProtected;
