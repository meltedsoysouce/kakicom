export type {
  NodeId,
  Timestamp,
  BlobId,
  Node,
  Payload,
  TextPayload,
  ImagePayload,
  MixedPayload,
  NodeKind,
  EpistemicState,
} from "./types.ts";

export { createNode, updateNode, generateNodeId, generateBlobId, now } from "./factory.ts";
export { isTextPayload, hasImage, extractText, extractBlobId } from "./payload.ts";
export { epistemicWeight, higherEpistemic } from "./epistemic.ts";

import type { EpistemicState } from "./types.ts";

/** 全EpistemicStateを確信度順に並べた配列。 */
export const EPISTEMIC_ORDER: readonly EpistemicState[] = [
  "certain",
  "likely",
  "hypothesis",
  "speculative",
  "unsure",
];
