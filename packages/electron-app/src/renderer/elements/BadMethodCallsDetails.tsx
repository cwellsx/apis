import * as React from "react";
import { BadMethodCall, LoadedMethodError, MethodName } from "../../shared-types";
import { makeRow, MethodTitle } from "./MethodTitle";

const toJson = (o: object) => <pre className="json">{JSON.stringify(o, null, " ")}</pre>;

const makeJsonRow = (first: object, next: object[] | undefined) => (
  <tr>
    <td>{toJson(first)}</td>
    {next?.map((o, index) => (
      <td key={index}>{toJson(o)}</td>
    ))}
  </tr>
);

type LoadedMethodErrorDetailsProps = {
  title?: MethodName;
  error: LoadedMethodError;
};
const LoadedMethodErrorDetails: React.FunctionComponent<LoadedMethodErrorDetailsProps> = (
  props: LoadedMethodErrorDetailsProps
) => {
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
          {title ? makeRow("Caller", <MethodTitle title={title} />) : <></>}
          {makeRow("Error", errorMessage)}
          {makeRow("Called type", toJson(wantType))}
          {makeRow("Candidates", candidates)}
        </tbody>
      </table>
    </section>
  );
};

type BadMethodCallsDetailsProps = {
  title?: MethodName;
  badMethodCalls: BadMethodCall[];
};
export const BadMethodCallsDetails: React.FunctionComponent<BadMethodCallsDetailsProps> = (
  props: BadMethodCallsDetailsProps
) => {
  const { title, badMethodCalls } = props;
  return (
    <>
      {badMethodCalls.map((badMethodCall, index) => (
        <LoadedMethodErrorDetails key={index} title={title} error={badMethodCall.error} />
      ))}
    </>
  );
};

type BadMethodExceptionProps = {
  title?: MethodName;
  exception: string;
};
export const BadMethodException: React.FunctionComponent<BadMethodExceptionProps> = (
  props: BadMethodExceptionProps
) => {
  const { title, exception } = props;
  return (
    <section className="errorDetails">
      <table>
        <tbody>
          {title ? makeRow("Caller", <MethodTitle title={title} />) : <></>}
          {makeRow("Exception", exception)}
        </tbody>
      </table>
    </section>
  );
};
