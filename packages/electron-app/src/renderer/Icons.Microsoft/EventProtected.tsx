import * as React from "react";
import type { SVGProps } from "react";
const SvgEventProtected = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" {...props}>
    <defs>
      <style>{".EventProtected_svg__canvas{fill:none;opacity:0}"}</style>
    </defs>
    <g id="EventProtected_svg__level-1">
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
        d="M7.349 10.652 3.5 14.5H2l3.5-6H2l4-7h5.387L7 6.5h4.5L8.173 9.828l-.585.085Z"
        style={{
          fill: "#996f00",
          opacity: 0.1,
        }}
      />
      <path
        d="M7.588 9.913 9 9.707l1.692-1.692.275-.556h.281l.606-.6L11.5 6H8.1l3.659-4.17-.371-.83H6l-.434.252-4 7L2 9h2.63l-3.062 5.248L2 15h1.5l.354-.146L7.01 11.7ZM3.293 14h-.422l3.061-5.248L5.5 8H2.862L6.29 2h3.994l-3.66 4.17L7 7h3.293Z"
        style={{
          fill: "#996f00",
          opacity: 1,
        }}
      />
    </g>
  </svg>
);
export default SvgEventProtected;
