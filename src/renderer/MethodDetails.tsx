import * as React from "react";
import { MethodBody } from "../shared-types";
import "./MethodDetails.css";

type MethodDetailsProps = {
  methodBody: MethodBody;
};

export const MethodDetails: React.FunctionComponent<MethodDetailsProps> = (props: MethodDetailsProps) => {
  const { methodBody } = props;
  return (
    <>
      <ul>
        <li>{methodBody.title.assemblyName}</li>
        <li>{methodBody.title.typeName}</li>
        <li>{methodBody.title.methodName}</li>
      </ul>
      <pre className="methodBody">{methodBody.asText}</pre>
    </>
  );
};
