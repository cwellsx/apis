import * as React from "react";
import { ViewErrors, ViewGreeting, ViewText, ViewWanted, Wanted } from "../shared-types";
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
    case "wanted":
      return getWanted(view);
  }
};

const getGreeting = (view: ViewGreeting): JSX.Element => <Message message={view.greeting} />;

const getErrors = (view: ViewErrors): JSX.Element => (
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

const getWanted = (view: ViewWanted): JSX.Element => {
  // it's already sorted alphabetically but now also sort by assembly
  const grouped: { [assemblyName: string]: Wanted[] } = {};
  view.wanted.forEach((wanted) => {
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
          <>{part}</>
        ) : (
          <>
            {separator}
            <wbr />
            {part}
          </>
        )
      );

  const split = (text: string | undefined): React.ReactNode => (!text ? "" : splitAt(text, "+"));

  return (
    <>
      <h2>Compiler-generated types</h2>
      <table>
        <thead>
          <tr>
            <th>Declared In</th>
            <th>This</th>
            <th>Resolved Type</th>
            <th>Resolved Method</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(grouped).map(([assemblyName, array]) => (
            <>
              <tr key={assemblyName}>
                <th colSpan={4}>{assemblyName}</th>
              </tr>
              {array.map((wanted, index) => (
                <tr key={`${assemblyName}-${index}`}>
                  <td>{split(wanted.declaringType)}</td>
                  <td>{split(wanted.nestedType)}</td>
                  <td>{split(wanted.wantedType)}</td>
                  <td>{wanted.wantedMethod}</td>
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </>
  );
};
