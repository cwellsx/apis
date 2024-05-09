import * as React from "react";
import { MethodBody, MethodError } from "../shared-types";
import "./MethodDetails.css";

// TODO continue this after or while modifying the format of the Error data returned from .NET
// because the .NET data is currently in Record.ToString() format not in JSON format

type MethodDetailsProps = {
  methodBody: MethodBody;
};

type ErrorDetailsProps = {
  error: MethodError;
};

const splitMessage = (message: string) => {
  const index = message.indexOf(": ");
  const firstPart = message.substring(0, index);
  const secondPart = message.substring(index + 2);
  if (!secondPart.startsWith("MethodId {")) throw new Error("Unexpected error message syntax");
  console.log(secondPart.substring(9));
  const methodInfo = JSON.parse(secondPart.substring(9));
  const stringify = (obj: unknown): string => JSON.stringify(obj, null, 2);
  const methodMember = stringify(methodInfo["MethodMember"]);
  const declaringType = stringify(methodInfo["declaringType"]);
  const genericTypeArguments = stringify(methodInfo["GenericTypeArguments"]);
  const genericMethodArguments = stringify(methodInfo["GenericMethodArguments"]);
  return { firstPart, methodMember, declaringType, genericTypeArguments, genericMethodArguments };
};

const ErrorDetails: React.FunctionComponent<ErrorDetailsProps> = (props: ErrorDetailsProps) => {
  const { error } = props;
  // the error.objects are initialized by the Error and Warning functions in src.dotnet/Core/MethodFinder.cs
  //const message = splitMessage(error.message);
  return (
    <>
      {/* <p>
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
      </ul> */}
      <pre>{error.message}</pre>
      {/* <table>
        <thead>
          <th>
            <td></td>
          </th>
        </thead>
      </table> */}
    </>
  );
};

export const MethodDetails: React.FunctionComponent<MethodDetailsProps> = (props: MethodDetailsProps) => {
  const { methodBody } = props;
  return (
    <section className="methodDetails">
      <header>
        {methodBody.title.assemblyName}
        <br />
        {methodBody.title.typeName}
        <br />
        {methodBody.title.methodName}
      </header>

      <pre className="methodBody">{methodBody.asText}</pre>
      {methodBody.errors?.map((error) => (
        <ErrorDetails error={error} />
      ))}
    </section>
  );
};
