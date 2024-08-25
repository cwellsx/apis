import * as React from "react";
import { DetailedCustom } from "../shared-types";
import "./MethodDetails.css";
import "./MethodDetails.scss";

type CustomDetailsProps = {
  details: DetailedCustom;
};
export const CustomDetails: React.FunctionComponent<CustomDetailsProps> = (props: CustomDetailsProps) => {
  const { details } = props;

  return (
    <section className="methodDetails">
      <h1>{details.id}</h1>

      <pre className="methodBody">{details.details.join("\r\n")}</pre>
    </section>
  );
};
