import type { NodeId } from "../node/index.ts";
import type { EdgeRelation } from "../projection/index.ts";
import { now } from "../node/index.ts";
import type { EdgeId, Edge } from "./types.ts";

export function generateEdgeId(): EdgeId {
  return crypto.randomUUID() as EdgeId;
}

export function createEdge(params: {
  sourceNodeId: NodeId;
  targetNodeId: NodeId;
  relation?: EdgeRelation;
  label?: string;
}): Edge {
  return {
    id: generateEdgeId(),
    sourceNodeId: params.sourceNodeId,
    targetNodeId: params.targetNodeId,
    relation: params.relation ?? "associated",
    label: params.label ?? null,
    createdAt: now(),
  };
}
