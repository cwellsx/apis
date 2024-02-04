import * as React from "react";
import { Types } from "../shared-types";

type DetailsProps = {
  types: Types;
};

export const Details: React.FunctionComponent<DetailsProps> = (props: DetailsProps) => {
  const { types } = props;
  return (
    <ul id="details">
      {types.namespaces.map((namespace) => (
        <li key={namespace.name}>
          {namespace.name}
          <ul>
            {namespace.typeNames.map((typename) => (
              <li key={namespace.name + "." + typename}>{typename}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
};
