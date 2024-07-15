import * as React from "react";
import { MethodNameStrings } from "../../shared-types";

export const makeRow = (first: string, second: JSX.Element | string) => (
  <tr>
    <th>{first}</th>
    <td>{second}</td>
  </tr>
);

type MethodTitleProps = {
  title: MethodNameStrings;
};
export const MethodTitle: React.FunctionComponent<MethodTitleProps> = (props: MethodTitleProps) => {
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
