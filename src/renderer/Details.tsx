import * as React from "react";
import CheckboxTree, { Node } from "react-checkbox-tree";
import type { Access, Exception, Members, Namespace, TextNode, Type, Types } from "../shared-types";
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

const getTypeIcon = (access: Access) => {
  switch (access) {
    case "public":
      return <Icon.SvgClassPublic />;
    case "protected":
      return <Icon.SvgClassProtected />;
    case "internal":
      return <Icon.SvgClassInternal />;
    case "private":
      return <Icon.SvgClassPrivate />;
  }
};

const getFieldIcon = (access: Access) => {
  switch (access) {
    case "public":
      return <Icon.SvgFieldPublic />;
    case "protected":
      return <Icon.SvgFieldProtected />;
    case "internal":
      return <Icon.SvgFieldInternal />;
    case "private":
      return <Icon.SvgFieldPrivate />;
  }
};

const getMethodIcon = (access: Access) => {
  switch (access) {
    case "public":
      return <Icon.SvgMethodPublic />;
    case "protected":
      return <Icon.SvgMethodProtected />;
    case "internal":
      return <Icon.SvgMethodInternal />;
    case "private":
      return <Icon.SvgMethodPrivate />;
  }
};

const getEventIcon = (access: Access | undefined) => {
  switch (access) {
    case "public":
      return <Icon.SvgEventPublic />;
    case "protected":
      return <Icon.SvgEventProtected />;
    case "internal":
      return <Icon.SvgEventInternal />;
    case "private":
      return <Icon.SvgEventPrivate />;
    default:
      return <Icon.SvgEventMissing />;
  }
};

const accessPriority = new Map<Access, number>([
  ["public", 4],
  ["protected", 3],
  ["internal", 2],
  ["private", 1],
]);

const getPropertyIcon = (getAccess: Access | undefined, setAccess: Access | undefined) => {
  const getPriority = (access: Access): number => accessPriority.get(access) ?? 0;
  const greater = (x: Access, y: Access): Access => (getPriority(x) > getPriority(y) ? x : y);
  const access = !getAccess ? setAccess : !setAccess ? getAccess : greater(getAccess, setAccess);
  switch (access) {
    case "public":
      return <Icon.SvgPropertyPublic />;
    case "protected":
      return <Icon.SvgPropertyProtected />;
    case "internal":
      return <Icon.SvgPropertyInternal />;
    case "private":
      return <Icon.SvgPropertyPrivate />;
    default:
      return <Icon.SvgPropertyMissing />;
  }
};

const convertMembers = (members: Members): Node[] => {
  const result: Node[] = [];
  result.push(
    ...members.fieldMembers.map((fieldMember) =>
      makeNode(fieldMember, getFieldIcon(fieldMember.access), fieldMember.attributes.map(convertAttribute))
    )
  );
  result.push(
    ...members.propertyMembers.map((propertyMember) =>
      makeNode(
        propertyMember,
        getPropertyIcon(propertyMember.getAccess, propertyMember.setAccess),
        propertyMember.attributes.map(convertAttribute)
      )
    )
  );
  result.push(
    ...members.constructorMembers.map((constructorMember) =>
      makeNode(
        constructorMember,
        getMethodIcon(constructorMember.access),
        constructorMember.attributes.map(convertAttribute)
      )
    )
  );
  result.push(
    ...members.methodMembers.map((methodMember) =>
      makeNode(methodMember, getMethodIcon(methodMember.access), methodMember.attributes.map(convertAttribute))
    )
  );
  result.push(
    ...members.eventMembers.map((eventMember) =>
      makeNode(eventMember, getEventIcon(eventMember.access), eventMember.attributes.map(convertAttribute))
    )
  );
  return result;
};

const convertTypes = (types: Type[] | undefined): Node[] => (types ? types.map(convertType) : []);
const convertType = (type: Type): Node =>
  isTypeException(type)
    ? makeNode(type, <Icon.SvgExclamationPoint />)
    : makeNode(type, getTypeIcon(type.access), [
        ...type.attributes.map(convertAttribute),
        ...convertTypes(type.subtypes),
        ...convertMembers(type.members),
      ]);

const convertNamespace = (namespace: Namespace): Node =>
  makeNode(namespace, <Icon.SvgNamespace />, namespace.types.map(convertType));

const getNodes = (types: Types): Node[] => [
  ...types.exceptions.map(convertException),
  ...types.namespaces.map(convertNamespace),
];

type DetailsProps = {
  types: Types;
};

type State = {
  types: Types;
  nodes: Node[];
  expanded: string[];
};

interface ActionNewNodes {
  type: "NewNodes";
  types: Types;
}

interface ActionSetExpanded {
  type: "SetExpanded";
  expanded: string[];
}

type Action = ActionNewNodes | ActionSetExpanded;

const initialState = (types: Types): State => {
  const nodes = getNodes(types);
  const expanded = nodes.map((node) => node.value);
  return { types, nodes, expanded };
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "NewNodes":
      return initialState(action.types);

    case "SetExpanded":
      return {
        ...state,
        expanded: action.expanded,
      };
  }
};

export const Details: React.FunctionComponent<DetailsProps> = (props: DetailsProps) => {
  const [state, dispatch] = React.useReducer(reducer, initialState(props.types));
  const { nodes, expanded } = state;
  const setExpanded = (expanded: string[]): void => dispatch({ type: "SetExpanded", expanded });

  React.useEffect(() => {
    if (props.types !== state.types) dispatch({ type: "NewNodes", types: props.types });
  }, [props, state.types]);

  return (
    <CheckboxTree
      nodes={nodes}
      expanded={expanded}
      onExpand={setExpanded}
      icons={icons}
      showNodeIcon={true}
      id="treeid"
      showExpandAll={false}
    />
  );
};
