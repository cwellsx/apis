import * as React from "react";
import {
  BadMethodInfoAndNames,
  CompilerMethod,
  ErrorsInfo,
  MethodNameStrings,
  ViewCompilerMethods,
  ViewCustomErrors,
  ViewErrors,
  ViewGreeting,
  ViewText,
} from "../shared-types";
import { Message } from "./Message";
import { BadCallDetails } from "./MethodDetails";
import { OnWheel } from "./useZoomPercent";

type TextViewProps = {
  view: ViewText;
  fontSize: number;
  onWheelFontSize: OnWheel;
};
export const TextView: React.FunctionComponent<TextViewProps> = (props: TextViewProps) => {
  const { view, fontSize, onWheelFontSize } = props;
  const style = { fontSize: fontSize };

  const text = getText(view);
  return (
    <div id="textView" onWheel={onWheelFontSize} style={style}>
      {text}
      <div className="zoom bottom">{`${fontSize}px`}</div>
    </div>
  );
};

const getText = (view: ViewText): JSX.Element => {
  switch (view.viewType) {
    case "greeting":
      return getGreeting(view);
    case "errors":
      return getErrors(view);
    case "customErrors":
      return getCustomErrors(view);
    case "compilerMethods":
      return getCompilerMethods(view);
  }
};

const getGreeting = (view: ViewGreeting): JSX.Element => <Message message={view.greeting} />;

const getCustomErrors = (view: ViewCustomErrors): JSX.Element => (
  <>
    <h2>Errors</h2>
    {view.customErrors?.map((customError, index) => (
      <section className="errorDetails" key={index}>
        <header>{customError.messages.join("\r\n")}</header>
        <pre>{customError.elementJson}</pre>
      </section>
    ))}
  </>
);

const getErrors = (view: ViewErrors): JSX.Element => {
  const getBadMethodInfo = (badMethodInfo: BadMethodInfoAndNames, index: number, assemblyName: string): JSX.Element => {
    // TODO display badMethodInfo.exception

    const title: MethodNameStrings = {
      assemblyName,
      declaringType: badMethodInfo.declaringType,
      methodMember: badMethodInfo.methodMember,
    };
    return (
      <React.Fragment key={index}>
        <>
          {badMethodInfo.badMethodCalls?.map((badMethodCall, index) => (
            <BadCallDetails error={badMethodCall.error} title={title} key={index} />
          ))}
        </>
      </React.Fragment>
    );
  };

  const getErrorsInfo = (errorsInfo: ErrorsInfo, index: number): JSX.Element => {
    // TODO display BadTypeInfo

    const assemblyName = errorsInfo.assemblyName;
    return (
      <React.Fragment key={index}>
        <h3>{assemblyName}</h3>
        {errorsInfo.badMethodInfos.map((badMethodInfo, index) => getBadMethodInfo(badMethodInfo, index, assemblyName))}
      </React.Fragment>
    );
  };

  return (
    <>
      <h2>Errors</h2>
      {view.errors?.map(getErrorsInfo)}
    </>
  );
};

const getCompilerMethods = (view: ViewCompilerMethods): JSX.Element => {
  // it's already sorted alphabetically but now also sort by assembly
  const grouped: { [assemblyName: string]: CompilerMethod[] } = {};
  view.compilerMethods.forEach((wanted) => {
    let found = grouped[wanted.assemblyName];
    if (!found) {
      found = [];
      grouped[wanted.assemblyName] = found;
    }
    found.push(wanted);
  });

  const splitAt = (text: string, separator: string): React.ReactNode =>
    text
      .split(separator)
      .map((part) => (separator == "<" ? part : part.length < 25 && part[0] !== "<" ? part : splitAt(part, "<")))
      .map((part, index) =>
        !index ? (
          <React.Fragment key={index}>{part}</React.Fragment>
        ) : (
          <React.Fragment key={index}>
            {separator}
            <wbr />
            {part}
          </React.Fragment>
        )
      );

  const split = (text: string | undefined): React.ReactNode => (!text ? "" : splitAt(text, "+"));

  // const unusual = view.wanted.filter((wanted) => wanted.declaringType !== wanted.ownerType);

  /*
      If we display everything in the wanted column then it's too wide, but normally:
      - declaringType === wantedType
      - nestedType.StartsWith(declaringType)
      So exclude declaringType and wantedType from the normal table, but this preamble says if there are any exceptions.
  */

  return (
    <>
      <h2>Compiler-generated types</h2>

      <table>
        <thead>
          <tr>
            <th>Declared In</th>
            <th>Compiler Method</th>
            <th>Called By Method</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(grouped).map(([assemblyName, array]) => (
            <React.Fragment key={assemblyName}>
              <tr>
                <th colSpan={4}>{assemblyName}</th>
              </tr>
              {array.map((columns, index) => (
                <tr key={`${assemblyName}-${index}`}>
                  <td>{split(columns.declaringType)}</td>
                  <td>
                    {split(columns.compilerType)}
                    <br />
                    {columns.compilerMethod}
                  </td>
                  <td>
                    {split(columns.ownerType)}
                    <br />
                    {columns.ownerMethod}
                  </td>
                  <td>{columns.error}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </>
  );
};
