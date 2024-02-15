import * as React from "react";
import CheckboxTree, { Node } from "react-checkbox-tree";
import type { Exception, Namespace, Type, TypeKnown, Types } from "../shared-types";
import { isTypeException } from "../shared-types";
import { icons } from "./3rd-party/checkboxTreeIcons";
import * as Icon from "./Icons.Microsoft";

const convertException = (exception: Exception): Node => {
  return {
    label: exception.label,
    value: exception.id,
  };
};

const getIcon = (type: TypeKnown) => {
  switch (type.access) {
    case "public":
      return <Icon.SvgClassPublic />;
    case "protected":
      return <Icon.SvgClassProtected />;
    case "internal":
      return <Icon.SvgClassInternal />;
    case "private":
      return <Icon.SvgClassPrivate />;
    default:
      return <Icon.SvgExclamationPoint />;
  }
};

const convertType = (type: Type): Node => {
  return {
    label: type.label,
    value: type.id,
    showCheckbox: false,
    icon: isTypeException(type) ? <Icon.SvgExclamationPoint /> : getIcon(type),
    //children: namespace.types.map(convertType)
  };
};

const convertNamespace = (namespace: Namespace): Node => {
  return {
    label: namespace.label,
    value: namespace.id,
    showCheckbox: false,
    children: namespace.types.map(convertType),
    icon: <Icon.SvgNamespace />,
  };
};

const getNodes = (types: Types): Node[] => [
  ...types.exceptions.map(convertException),
  ...types.namespaces.map(convertNamespace),
];

type DetailsProps = {
  types: Types;
};

export const Details: React.FunctionComponent<DetailsProps> = (props: DetailsProps) => {
  const { types } = props;

  const [expanded, setExpanded] = React.useState<string[]>([]);

  return (
    <CheckboxTree
      nodes={getNodes(types)}
      expanded={expanded}
      onExpand={setExpanded}
      icons={icons}
      showNodeIcon={true}
      id="treeid"
      showExpandAll={false}
    />
  );
};
