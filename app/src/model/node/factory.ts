import type { Node, NodeId, BlobId, Timestamp, Payload, NodeKind, EpistemicState } from "./types.ts";

export function generateNodeId(): NodeId {
  return crypto.randomUUID() as NodeId;
}

export function generateBlobId(): BlobId {
  return crypto.randomUUID() as BlobId;
}

export function now(): Timestamp {
  return Date.now() as Timestamp;
}

export function createNode(params: {
  payload: Payload;
  kind?: NodeKind;
  epistemicState?: EpistemicState;
}): Node {
  return {
    id: generateNodeId(),
    payload: params.payload,
    kind: params.kind ?? "note",
    epistemicState: params.epistemicState ?? "unsure",
    createdAt: now(),
  };
}

export function updateNode(
  node: Node,
  patch: Partial<Pick<Node, "payload" | "kind" | "epistemicState">>,
): Node {
  return { ...node, ...patch };
}
