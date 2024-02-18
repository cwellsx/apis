import * as React from "react";
import CheckboxTree, { Node } from "react-checkbox-tree";
import type { Exception, Namespace, TextNode, Type, TypeKnown, Types } from "../shared-types";
import { isTypeException } from "../shared-types";
import { icons } from "./3rd-party/checkboxTreeIcons";
import * as Icon from "./Icons.Microsoft";

const makeNode = (textNode: TextNode, icon: JSX.Element, children?: Node[]): Node => {
  if (children && children.length === 0) children = undefined;
  return {
    label: textNode.label,
    value: textNode.id,
    showCheckbox: false,
    icon: icon,
    children,
  };
};

const convertException = (exception: Exception): Node => makeNode(exception, <Icon.SvgExclamationPoint />);
const convertAttribute = (attribute: TextNode): Node => makeNode(attribute, <Icon.SvgAttribute />);

const getTypeIcon = (type: TypeKnown) => {
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

const convertTypes = (types: Type[] | undefined): Node[] => (types ? types.map(convertType) : []);
const convertType = (type: Type): Node =>
  isTypeException(type)
    ? makeNode(type, <Icon.SvgExclamationPoint />)
    : makeNode(type, getTypeIcon(type), [...type.attributes.map(convertAttribute), ...convertTypes(type.subtypes)]);

const convertNamespace = (namespace: Namespace): Node =>
  makeNode(namespace, <Icon.SvgNamespace />, namespace.types.map(convertType));

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
