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

import type {
  Projection,
  ProjectionOutput,
  Position,
  Edge,
  EdgeRelation,
  Annotation,
  AnnotationKind,
  Transform,
} from "./types.ts";

import type { NodeId } from "../node/index.ts";

// ── Projection 生成 ──

/** 新しいProjectionを生成する。初期状態ではoutputは空。 */
export function createProjection(_params: {
  name: string;
  description?: string;
  inputNodes: readonly NodeId[];
  transform: Transform;
}): Projection {
  throw new Error("not implemented");
}

/** ManualTransform のProjectionを簡易生成する（MVP用）。 */
export function createManualProjection(_params: {
  name: string;
  inputNodes: readonly NodeId[];
  positions: ReadonlyMap<NodeId, Position>;
}): Projection {
  throw new Error("not implemented");
}

// ── ProjectionOutput 操作 ──

/** 空のProjectionOutputを生成する。 */
export function emptyOutput(): ProjectionOutput {
  throw new Error("not implemented");
}

/** 既存のProjectionOutputにpositionを追加・更新する。 */
export function setPosition(
  _output: ProjectionOutput,
  _nodeId: NodeId,
  _position: Position,
): ProjectionOutput {
  throw new Error("not implemented");
}

/** 既存のProjectionOutputにedgeを追加する。 */
export function addEdge(
  _output: ProjectionOutput,
  _edge: Edge,
): ProjectionOutput {
  throw new Error("not implemented");
}

/** 既存のProjectionOutputにannotationを追加する。 */
export function addAnnotation(
  _output: ProjectionOutput,
  _annotation: Annotation,
): ProjectionOutput {
  throw new Error("not implemented");
}

/** 二つのProjectionOutputをマージする。positionsは後勝ち。 */
export function mergeOutputs(
  _a: ProjectionOutput,
  _b: ProjectionOutput,
): ProjectionOutput {
  throw new Error("not implemented");
}

// ── Edge / Annotation 生成 ──

/** Edgeを生成する。 */
export function createEdge(_params: {
  sourceNodeId: NodeId;
  targetNodeId: NodeId;
  relation: EdgeRelation;
  label?: string;
  weight?: number;
}): Edge {
  throw new Error("not implemented");
}

/** Annotationを生成する。 */
export function createAnnotation(_params: {
  targetNodeId: NodeId;
  kind: AnnotationKind;
  content: string;
  voiceType?: "self" | "llm" | "future_self" | "external";
}): Annotation {
  throw new Error("not implemented");
}

// ── Position ユーティリティ ──

/** 二点間の距離を計算する。 */
export function distance(_a: Position, _b: Position): number {
  throw new Error("not implemented");
}

/** 位置を平行移動する。 */
export function translate(
  _pos: Position,
  _dx: number,
  _dy: number,
): Position {
  throw new Error("not implemented");
}

/** Position集合の重心を計算する。 */
export function centroid(_positions: readonly Position[]): Position {
  throw new Error("not implemented");
}
