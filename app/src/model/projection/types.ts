import type { NodeId, Timestamp } from "../node/index.ts";

/**
 * Projectionの一意識別子。
 */
export type ProjectionId = string & { readonly __brand: "ProjectionId" };

/**
 * Node集合を別の意味空間へ写像する操作。
 *
 * 不変条件:
 *   - inputNodes内のNodeを変更しない
 *   - outputはtransformとinputNodesから決定的に導出可能
 */
export interface Projection {
  readonly id: ProjectionId;
  readonly name: string;
  readonly description: string;
  readonly inputNodes: readonly NodeId[];
  readonly transform: Transform;
  readonly output: ProjectionOutput;
  readonly createdAt: Timestamp;
}

/**
 * 変換の仕様を記述するデータ。
 * 「何をしたいか」の宣言であり「どう計算するか」の手続きではない。
 */
export type Transform =
  | ManualTransform
  | SpatialClusterTransform
  | LogicalStructureTransform
  | DependencyTransform
  | TimelineTransform
  | CustomTransform;

/** ユーザーが手動で配置した結果をそのまま保持する。MVP段階の主要なTransform。 */
export interface ManualTransform {
  readonly type: "manual";
}

/** Node間の類似性に基づいて空間クラスタリングする。 */
export interface SpatialClusterTransform {
  readonly type: "spatial_cluster";
  readonly similarityMetric: string;
  readonly clusterCount: number | null;
}

/** 論理的な構造（前提→結論、原因→結果）を抽出する。 */
export interface LogicalStructureTransform {
  readonly type: "logical_structure";
  readonly structureType: "causal" | "prerequisite" | "argument";
}

/** Node間の依存関係を抽出する。 */
export interface DependencyTransform {
  readonly type: "dependency";
  readonly dependencyType: string;
}

/** 時系列に沿ってNodeを配列する。 */
export interface TimelineTransform {
  readonly type: "timeline";
  readonly timeField: "created_at" | "last_event";
}

/** ユーザーまたはLLMが定義したカスタム変換。 */
export interface CustomTransform {
  readonly type: "custom";
  readonly name: string;
  readonly params: Record<string, unknown>;
}

/**
 * Projectionの出力。
 * 位置・辺・注釈の3要素からなる。
 */
export interface ProjectionOutput {
  readonly positions: ReadonlyMap<NodeId, Position>;
  readonly edges: readonly Edge[];
  readonly annotations: readonly Annotation[];
}

/**
 * ワールド座標上の位置。
 */
export interface Position {
  readonly x: number;
  readonly y: number;
}

/**
 * 二つのNode間の関係線。
 * Projectionが出力する構造的情報。
 */
export interface Edge {
  readonly sourceNodeId: NodeId;
  readonly targetNodeId: NodeId;
  readonly relation: EdgeRelation;
  readonly label: string | null;
  readonly weight: number;
}

/**
 * Edge の意味的種別。
 */
export type EdgeRelation =
  | "causal"
  | "prerequisite"
  | "similar"
  | "contradicts"
  | "depends_on"
  | "associated"
  | "custom";

/**
 * Projectionが出力する注釈・質問・警告。
 * Nodeに対するメタ的コメントであり、Nodeを変更しない。
 */
export interface Annotation {
  readonly id: string;
  readonly targetNodeId: NodeId;
  readonly kind: AnnotationKind;
  readonly content: string;
  readonly voiceType: "self" | "llm" | "future_self" | "external";
}

/**
 * 注釈の種別。
 */
export type AnnotationKind =
  | "note"
  | "question"
  | "warning"
  | "suggestion"
  | "gap";
