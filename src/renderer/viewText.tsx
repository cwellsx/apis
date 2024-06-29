import * as React from "react";
import { ViewText } from "../shared-types";
import { Message } from "./Message";
import { BadCallDetails } from "./MethodDetails";

export const getText = (view: ViewText): JSX.Element => {
  switch (view.viewType) {
    case "greeting":
      return <Message message={view.greeting} />;

    case "errors":
      return (
        <>
          <h2>Errors</h2>
          {view.customErrors?.map((customError, index) => (
            <section className="errorDetails" key={index}>
              <header>{customError.messages.join("\r\n")}</header>
              <pre>{customError.elementJson}</pre>
            </section>
          ))}
          {view.errors?.map((errorsInfo) =>
            errorsInfo.badCallDetails.map((badCall, index) => (
              <BadCallDetails badCall={badCall} key={errorsInfo.assemblyName + index} />
            ))
          )}
        </>
      );

    case "wanted":
      return (
        <>
          <h2>Compiler-generated types</h2>
          <table>
            <thead>
              <tr>
                <th>Assembly</th>
                <th>Declared In</th>
                <th>This</th>
                <th>Resolved Type</th>
                <th>Resolved Method</th>
              </tr>
            </thead>
            <tbody>
              {view.wanted.map((wanted) => (
                <tr>
                  <th>{wanted.assemblyName}</th>
                  <th>{wanted.declaringType}</th>
                  <th>{wanted.nestedType}</th>
                  <th>{wanted.wantedType}</th>
                  <th>{wanted.wantedMethod}</th>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      );
  }
};
