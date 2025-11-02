import { ViewCustomErrors } from "backend-ui";
import * as React from "react";

type TextCustomErrorsProps = {
  view: ViewCustomErrors;
};
export const TextCustomErrors: React.FunctionComponent<TextCustomErrorsProps> = (props: TextCustomErrorsProps) => {
  const { view } = props;
  return (
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
};
