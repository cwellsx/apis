import type { EdgeId, NodeId } from "../contracts-ui";
import { edgeIdToText, nodeIdToText, textToEdgeId } from "../contracts-ui";

// want to distinguish the string from a NodeId versus the string from an EdgeId
// could do this by adding a unique prefix e.g. `$` or `!` to the string value
// instead look inside the string:
// - NodeId strings may contain `|`
// - EdgeId strings are two NodeId strings joined by `||`

const edgeIdSeparator = "||";

export const nodeIdsToEdgeId = (clientId: NodeId, serverId: NodeId): EdgeId =>
  textToEdgeId(`${nodeIdToText(clientId)}${edgeIdSeparator}${nodeIdToText(serverId)}`);

// toDotFormat uses these two -- to split EdgeId to two strings, and recombine them into edgeId string

export const edgeIdToNodeIdText = (edgeId: EdgeId): { clientId: string; serverId: string } => {
  const split = edgeIdToText(edgeId).split(edgeIdSeparator);
  return { clientId: split[0], serverId: split[1] };
};

export const nodeIdTextToEdgeIdText = (clientId: string, serverId: string): string =>
  `${clientId}${edgeIdSeparator}${serverId}`;
