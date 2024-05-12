import * as React from "react";
import { CustomError, MethodError, isCustomError } from "../shared-types";
import "./MethodDetails.css";

type ErrorDetailsProps = {
  error: MethodError | CustomError;
};

/* 
<p>
  {error.heading}: {message.firstPart}
</p>
<ul>
  <li>
    Type<pre>{message.declaringType}</pre>
  </li>
  <li>
    Method<pre>{message.methodMember}</pre>
  </li>
  <li>
    Type arguments<pre>{message.genericTypeArguments}</pre>
  </li>
  <li>
    Method arguments<pre>{message.genericMethodArguments}</pre>
  </li>
</ul>
<pre>{error.message}</pre>
<table>
  <thead>
    <th>
      <td></td>
    </th>
  </thead>
</table>
*/

const getMethodError = (error: MethodError): JSX.Element => <pre>{error.message}</pre>;

const getCustomError = (error: CustomError): JSX.Element => (
  <>
    <header>{error.messages.join("\r\n")}</header>
    <pre>{error.elementJson}</pre>
  </>
);

export const ErrorDetails: React.FunctionComponent<ErrorDetailsProps> = (props: ErrorDetailsProps) => {
  const { error } = props;
  const details = isCustomError(error) ? getCustomError(error) : getMethodError(error);
  // the error.objects are initialized by the Error and Warning functions in src.dotnet/Core/MethodFinder.cs
  //const message = splitMessage(error.message);
  return <section className="errorDetails">{details}</section>;
};
