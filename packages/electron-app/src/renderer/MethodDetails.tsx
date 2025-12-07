import { DetailedMethod } from "backend-ui";
import * as React from "react";
import { MethodTitle } from "./elements";
import "./MethodDetails.css";
import "./MethodDetails.scss";

type MethodDetailsProps = { methodBody: DetailedMethod };
export const MethodDetails: React.FunctionComponent<MethodDetailsProps> = (props: MethodDetailsProps) => {
  const { methodBody } = props;

  return (
    <section className="methodDetails">
      <h2>Method</h2>
      <MethodTitle title={methodBody.title} />
      <pre className="methodBody">{methodBody.asText}</pre>
    </section>
  );
};
