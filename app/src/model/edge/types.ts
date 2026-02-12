import type { NodeId, Timestamp } from "../node/index.ts";
import type { EdgeRelation } from "../projection/index.ts";

/**
 * Edgeの一意識別子。
 * ブランド型で string と区別する。
 */
export type EdgeId = string & { readonly __brand: "EdgeId" };

/**
 * Node間の永続的な接続。
 * 有向（source → target）で、relation による意味的種別を持つ。
 *
 * Projection の Edge（導出的な写像出力）とは異なり、
 * ユーザーが明示的に作成し IndexedDB に永続化される。
 */
export interface Edge {
  readonly id: EdgeId;
  readonly sourceNodeId: NodeId;
  readonly targetNodeId: NodeId;
  readonly relation: EdgeRelation;
  readonly label: string | null;
  readonly createdAt: Timestamp;
}
