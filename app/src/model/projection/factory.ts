import type { Projection, Transform, Position, ProjectionOutput } from "./types.ts";
import type { NodeId } from "../node/types.ts";
import type { ProjectionId } from "./types.ts";
import { now } from "../node/index.ts";
import { emptyOutput } from "./output.ts";

export function createProjection(params: {
  name: string;
  description?: string;
  inputNodes: readonly NodeId[];
  transform: Transform;
}): Projection {
  return {
    id: crypto.randomUUID() as ProjectionId,
    name: params.name,
    description: params.description ?? "",
    inputNodes: params.inputNodes,
    transform: params.transform,
    output: emptyOutput(),
    createdAt: now(),
  };
}

export function createManualProjection(params: {
  name: string;
  inputNodes: readonly NodeId[];
  positions: ReadonlyMap<NodeId, Position>;
}): Projection {
  const output: ProjectionOutput = {
    positions: params.positions,
    edges: [],
    annotations: [],
  };
  return {
    id: crypto.randomUUID() as ProjectionId,
    name: params.name,
    description: "",
    inputNodes: params.inputNodes,
    transform: { type: "manual" },
    output,
    createdAt: now(),
  };
}
