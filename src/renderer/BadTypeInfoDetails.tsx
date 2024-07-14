import * as React from "react";
import { BadTypeInfoAndNames } from "../shared-types";

type BadTypeInfoDetailsProps = {
  badTypeInfos: BadTypeInfoAndNames[];
};
export const BadTypeInfoDetails: React.FunctionComponent<BadTypeInfoDetailsProps> = (
  props: BadTypeInfoDetailsProps
) => {
  const { badTypeInfos } = props;
  return (
    <ul>
      {badTypeInfos.map((badTypeInfo, index) => (
        <li key={index}>
          {badTypeInfo.typeName ? badTypeInfo.typeName : "unknown type name"}
          <ul>
            {badTypeInfo.exceptions.map((exception, index) => (
              <li key={index}>{exception}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
};
