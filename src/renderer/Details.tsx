import * as React from "react";
import CheckboxTree, { Node } from "react-checkbox-tree";
import { Namespace, Type, Types } from "../shared-types";
import { icons } from "./3rd-party/checkboxTreeIcons";
import * as Icon from "./Icons.Microsoft";

const convertType = (type: Type): Node => {
  const getIcon = () => {
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
  return {
    label: type.name,
    value: "!!" + type.name,
    showCheckbox: false,
    icon: getIcon(),
    //children: namespace.types.map(convertType)
  };
};

const convertNamespace = (namespace: Namespace): Node => {
  return {
    label: namespace.name,
    value: "!" + namespace.name,
    showCheckbox: false,
    children: namespace.types.map(convertType),
    icon: <Icon.SvgNamespace />,
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
      showNodeIcon={true}
      id="treeid"
      showExpandAll={false}
    />
  );
};
