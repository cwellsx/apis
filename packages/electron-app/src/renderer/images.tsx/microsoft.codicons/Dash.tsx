import type { SVGProps } from "react";
import * as React from "react";
const SvgDash = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M5 8.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5" clipRule="evenodd" />
  </svg>
);
export default SvgDash;
