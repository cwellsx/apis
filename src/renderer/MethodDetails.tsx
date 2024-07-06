import * as React from "react";
import { DetailedMethod, LoadedMethodError, MethodNameStrings } from "../shared-types";
import "./MethodDetails.css";

const toJson = (o: object) => <pre className="json">{JSON.stringify(o, null, " ")}</pre>;

const makeJsonRow = (first: object, next: object[] | undefined) => (
  <tr>
    <th>{toJson(first)}</th>
    {next?.map((o, index) => (
      <td key={index}>{toJson(o)}</td>
    ))}
  </tr>
);

const makeRow = (first: string, second: JSX.Element | string) => (
  <tr>
    <th>{first}</th>
    <td>{second}</td>
  </tr>
);

type HeaderProps = {
  title: MethodNameStrings;
};
const Header: React.FunctionComponent<HeaderProps> = (props: HeaderProps) => {
  const { title } = props;
  return (
    <table>
      <tbody>
        {makeRow("Assembly", title.assemblyName)}
        {makeRow("Type", title.declaringType)}
        {makeRow("Signature", title.methodMember)}
      </tbody>
    </table>
  );
};

type MethodDetailsProps = {
  methodBody: DetailedMethod;
};
export const MethodDetails: React.FunctionComponent<MethodDetailsProps> = (props: MethodDetailsProps) => {
  const { methodBody } = props;
  return (
    <section className="methodDetails">
      <h2>Method</h2>
      <Header title={methodBody.title} />

      <pre className="methodBody">{methodBody.asText}</pre>
      {methodBody.errors?.map((error, index) => (
        <BadCallDetails key={index} title={methodBody.title} error={error} />
      ))}
    </section>
  );
};

type BadCallDetailsProps = {
  title: MethodNameStrings;
  error: LoadedMethodError;
};
export const BadCallDetails: React.FunctionComponent<BadCallDetailsProps> = (props: BadCallDetailsProps) => {
  const { error, title } = props;
  const {
    errorMessage,
    wantType,
    wantMethod,
    genericTypeArguments,
    genericMethodArguments,
    foundMethods,
    transformedMethods,
  } = error;

  const nFound = error.foundMethods?.length ?? 0;
  const colSpan = Math.max(nFound, 1);
  const tbody =
    genericTypeArguments || genericMethodArguments ? (
      <>
        {makeJsonRow(wantMethod, transformedMethods)}
        {makeJsonRow({ genericTypeArguments, genericMethodArguments }, foundMethods)}
      </>
    ) : (
      makeJsonRow(wantMethod, foundMethods)
    );
  const candidates = (
    <table>
      <thead>
        <tr>
          <th>Wanted</th>
          <th colSpan={colSpan}>Found</th>
        </tr>
      </thead>
      <tbody>{tbody}</tbody>
    </table>
  );

  // the error.objects are initialized by the Error and Warning functions in src.dotnet/Core/MethodFinder.cs
  //const message = splitMessage(error.message);
  return (
    <section className="errorDetails">
      <table>
        <tbody>
          {makeRow("Method", <Header title={title} />)}
          {makeRow("Error", errorMessage)}
          {makeRow("Candidates", candidates)}
        </tbody>
      </table>
    </section>
  );
};
