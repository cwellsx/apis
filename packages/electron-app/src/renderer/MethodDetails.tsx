import { DetailedMethod } from "backend-types";
import * as React from "react";
import { BadMethodCallsDetails, MethodTitle } from "./elements";
import "./MethodDetails.css";
import "./MethodDetails.scss";

type MethodDetailsProps = {
  methodBody: DetailedMethod;
};
export const MethodDetails: React.FunctionComponent<MethodDetailsProps> = (props: MethodDetailsProps) => {
  const { methodBody } = props;
  const errors = methodBody.badMethodCalls ? (
    <>
      <h3>Errors</h3>
      <BadMethodCallsDetails badMethodCalls={methodBody.badMethodCalls} />
    </>
  ) : (
    <></>
  );

  return (
    <section className="methodDetails">
      <h2>Method</h2>
      <MethodTitle title={methodBody.title} />

      <pre className="methodBody">{methodBody.asText}</pre>
      {errors}
    </section>
  );
};
