import * as React from "react";
import CheckboxTree, { Node } from "react-checkbox-tree";
import { Namespace, Type, Types } from "../shared-types";
import { icons } from "./3rd-party/checkboxTreeIcons";

const convertType = (type: Type): Node => {
  return {
    label: type.name,
    value: "!!" + type.name,
    showCheckbox: false,
    //children: namespace.types.map(convertType)
  };
};

const convertNamespace = (namespace: Namespace): Node => {
  return {
    label: namespace.name,
    value: "!" + namespace.name,
    showCheckbox: false,
    children: namespace.types.map(convertType),
  };
};

const getNodes = (types: Types): Node[] => types.namespaces.map(convertNamespace);

type DetailsProps = {
  types: Types;
};

export const Details: React.FunctionComponent<DetailsProps> = (props: DetailsProps) => {
  const { types } = props;

  const [expanded, setExpanded] = React.useState<string[]>([]);

  return (
    <CheckboxTree
      nodes={getNodes(types)}
      //checked={leafVisible}
      expanded={expanded}
      //onCheck={onCheck}
      onExpand={setExpanded}
      icons={icons}
      showNodeIcon={false}
      id="treeid"
      showExpandAll={false}
    />
  );
};
