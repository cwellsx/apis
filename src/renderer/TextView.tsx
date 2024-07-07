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
import "./TextView.scss";
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
  const join = (parts: string[], separator: JSX.Element): React.ReactNode =>
    parts.map((part, index) =>
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

  const split = (text: string): React.ReactNode => (!text ? "" : join(text.split("+"), <br />));

  // it's already sorted alphabetically but now also group by assembly
  const assemblyMethods = new Map<string, CompilerMethod[]>();
  view.compilerMethods.forEach((compilerMethod) => {
    let found = assemblyMethods.get(compilerMethod.assemblyName);
    if (!found) {
      found = [];
      assemblyMethods.set(compilerMethod.assemblyName, found);
    }
    found.push(compilerMethod);
  });

  const getOwnerCell = (compilerMethod: CompilerMethod): JSX.Element =>
    compilerMethod.error ? (
      <ul>
        {compilerMethod.callStack?.map((methodNameStrings, index) => (
          <li key={index}>
            {methodNameStrings.declaringType}
            <br />
            {methodNameStrings.methodMember}
          </li>
        ))}
      </ul>
    ) : compilerMethod.info ? (
      <>{compilerMethod.info}</>
    ) : (
      <>
        {split(compilerMethod.ownerType)}
        <br />
        {compilerMethod.ownerMethod}
      </>
    );

  const showAssembly = (assemblyName: string, compilerMethods: CompilerMethod[]): JSX.Element => (
    <React.Fragment key={assemblyName}>
      <h3>{assemblyName}</h3>
      <table className="compilerMethods">
        <thead>
          <tr>
            <th rowSpan={3}>Error</th>
            <th>Namespace / Declared In</th>
          </tr>
          <tr>
            <th>Compiler Method</th>
          </tr>
          <tr>
            <th>Called By Method</th>
          </tr>
        </thead>
        <tbody>
          {compilerMethods.map((compilerMethod, index) => (
            <React.Fragment key={index}>
              <tr>
                <td rowSpan={3} className="error">
                  {compilerMethod.error}
                </td>
                <td className="container">
                  {compilerMethod.compilerNamespace}
                  <br />
                  {compilerMethod.declaringType}
                </td>
              </tr>
              <tr>
                <td>
                  {split(compilerMethod.compilerType)}
                  <br />
                  {compilerMethod.compilerMethod}
                </td>
              </tr>
              <tr>
                <td className="owner">{getOwnerCell(compilerMethod)}</td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </React.Fragment>
  );

  return (
    <>
      <h2>Compiler-generated types</h2>
      {[...assemblyMethods.entries()].map(([assemblyName, compilerMethods]) =>
        showAssembly(assemblyName, compilerMethods)
      )}
    </>
  );
};
