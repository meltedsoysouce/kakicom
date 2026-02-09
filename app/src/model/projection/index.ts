export type {
  ProjectionId,
  Projection,
  Transform,
  ManualTransform,
  SpatialClusterTransform,
  LogicalStructureTransform,
  DependencyTransform,
  TimelineTransform,
  CustomTransform,
  ProjectionOutput,
  Position,
  Edge,
  EdgeRelation,
  Annotation,
  AnnotationKind,
} from "./types.ts";

import type { NodeId } from "../node/index.ts";
import type { EdgeRelation, AnnotationKind, Edge, Annotation } from "./types.ts";

export {
  createProjection,
  createManualProjection,
} from "./factory.ts";

export {
  emptyOutput,
  setPosition,
  addEdge,
  addAnnotation,
  mergeOutputs,
} from "./output.ts";

export {
  distance,
  translate,
  centroid,
} from "./position.ts";

/** Edgeを生成する。 */
export function createEdge(params: {
  sourceNodeId: NodeId;
  targetNodeId: NodeId;
  relation: EdgeRelation;
  label?: string;
  weight?: number;
}): Edge {
  return {
    sourceNodeId: params.sourceNodeId,
    targetNodeId: params.targetNodeId,
    relation: params.relation,
    label: params.label ?? null,
    weight: params.weight ?? 1.0,
  };
}

/** Annotationを生成する。 */
export function createAnnotation(params: {
  targetNodeId: NodeId;
  kind: AnnotationKind;
  content: string;
  voiceType?: "self" | "llm" | "future_self" | "external";
}): Annotation {
  return {
    id: crypto.randomUUID(),
    targetNodeId: params.targetNodeId,
    kind: params.kind,
    content: params.content,
    voiceType: params.voiceType ?? "self",
  };
}
