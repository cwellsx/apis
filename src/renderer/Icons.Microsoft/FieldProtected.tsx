import * as React from "react";
import type { SVGProps } from "react";
const SvgFieldProtected = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" {...props}>
    <defs>
      <style>
        {
          ".FieldProtected_svg__canvas{fill:none;opacity:0}.FieldProtected_svg__light-blue,.FieldProtected_svg__light-blue-10{fill:#005dba;opacity:.1}.FieldProtected_svg__light-blue{opacity:1}"
        }
      </style>
    </defs>
    <g id="FieldProtected_svg__level-1">
      <g
        style={{
          opacity: 0.75,
        }}
      >
        <path
          d="M5.192 13.518 1.5 10.4V6.244l8.308-4.615L13.5 5.321V6H13v1.459h-2.034L9.922 9.573l-2.334.339-.659 2.036.4.386Z"
          className="FieldProtected_svg__light-blue-10"
        />
        <path
          d="m7.325 12.334.747.729-2.637 1.465-.6-.084-3.689-3.692L1 10.4V6.244l.257-.437 8.308-4.616.6.084 3.692 3.693.143.353v3.95l-.894-1.812H13V5.528L9.721 2.249 2 6.538v3.653l2.692 2.692V9.608h1v3.633Z"
          className="FieldProtected_svg__light-blue"
        />
      </g>
      <path
        d="M13.418 5.22 5.239 9.764 1.6 6.129l8.18-4.545Z"
        className="FieldProtected_svg__light-blue-10"
      />
      <path
        d="m5.477 10.194-.586-.082-3.635-3.635.109-.777 8.178-4.546.587.083 3.636 3.635-.108.778ZM2.455 6.285l2.869 2.869 7.266-4.036-2.869-2.869Z"
        className="FieldProtected_svg__light-blue"
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
export default SvgFieldProtected;
