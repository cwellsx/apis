import * as React from "react";
import type { SVGProps } from "react";
const SvgMethodProtected = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" {...props}>
    <defs>
      <style>
        {
          ".MethodProtected_svg__canvas{fill:none;opacity:0}.MethodProtected_svg__light-purple-10{fill:#6936aa;opacity:.1}.MethodProtected_svg__light-purple{fill:#6936aa;opacity:1}"
        }
      </style>
    </defs>
    <g id="MethodProtected_svg__level-1">
      <g
        style={{
          opacity: 0.75,
        }}
      >
        <path
          d="m6.929 11.948.368.36-1.265.73-4.543-2.6V5.054L6 2.447l4.529 2.6v3.291l-.61 1.235-2.334.339Z"
          className="MethodProtected_svg__light-purple-10"
        />
        <path
          d="M11 5.031v2.428h-.034L10 9.415V5.32L6 3.01 2 5.32v4.831l3.5 2.021V7.825h1v4.347l.438-.253-.009.029.728.71-1.407.813h-.5l-4.5-2.6L1 10.44V5.031l.25-.431L5.75 2h.5l4.5 2.6Z"
          className="MethodProtected_svg__light-purple"
        />
      </g>
      <path
        d="m6 2.447 4.529 2.6-4.518 2.64-4.522-2.634Z"
        className="MethodProtected_svg__light-purple-10"
      />
      <path
        d="M5.759 8.119 1.237 5.484V4.62l4.514-2.6h.5l4.528 2.6v.866L6.263 8.119ZM2.486 5.055 6.01 7.108l3.524-2.061L6 3.024Z"
        className="MethodProtected_svg__light-purple"
      />
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
    </g>
  </svg>
);
export default SvgMethodProtected;
