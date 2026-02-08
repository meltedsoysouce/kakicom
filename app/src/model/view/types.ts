import type { ProjectionId, Transform } from "../projection/index.ts";
import type { Timestamp } from "../node/index.ts";

/**
 * Viewの一意識別子。
 */
export type ViewId = string & { readonly __brand: "ViewId" };

/**
 * 認知レンズ。
 * Projection群 + InteractionMode + Affordanceの組み合わせ。
 *
 * 同一Node集合に対して複数のViewが存在しうる。
 * Viewを切り替えることで「見方」を変える。
 */
export interface View {
  readonly id: ViewId;
  readonly name: string;
  readonly description: string;
  readonly projections: readonly ProjectionId[];
  readonly interactionMode: InteractionMode;
  readonly affordances: readonly Affordance[];
  readonly config: ViewConfig;
  readonly createdAt: Timestamp;
}

/**
 * ユーザーがNodeと空間に対してどう関わるかを定義するモード。
 */
export type InteractionMode =
  | "free_explore"
  | "organize"
  | "explain"
  | "debug"
  | "reflect";

/**
 * InteractionModeの特性を記述するメタデータ。
 * UIヘルプやモード切替時のガイド表示に使用する。
 */
export interface InteractionModeDescriptor {
  readonly mode: InteractionMode;
  readonly label: string;
  readonly description: string;
  readonly defaultAffordances: readonly Affordance[];
  readonly suggestedTransforms: readonly Transform["type"][];
}

/**
 * Viewが提供する操作可能性。
 * UIが「何ができるか」をユーザーに示すためのデータ。
 */
export type Affordance =
  | "pan"
  | "zoom"
  | "select_node"
  | "drag_node"
  | "create_node"
  | "edit_node"
  | "delete_node"
  | "link_nodes"
  | "unlink_nodes"
  | "paste_image"
  | "change_epistemic"
  | "view_annotations"
  | "view_edges"
  | "view_history"
  | "switch_mode";

/**
 * Viewの表示設定。
 * 描画時の視覚的パラメータを保持する。
 */
export interface ViewConfig {
  /** 背景スタイル */
  readonly background: BackgroundStyle;
  /** DormancyState=Dormant のNodeを表示するか */
  readonly showDormant: boolean;
  /** DormancyState=Archived のNodeを表示するか */
  readonly showArchived: boolean;
  /** Edgeを表示するか */
  readonly showEdges: boolean;
  /** Annotationを表示するか */
  readonly showAnnotations: boolean;
  /** EpistemicStateに基づく視覚的強弱を適用するか */
  readonly epistemicVisuals: boolean;
  /** DormancyStateに基づく退色を適用するか */
  readonly dormancyVisuals: boolean;
}

/**
 * キャンバス背景のスタイル。
 */
export type BackgroundStyle = "none" | "dot_grid" | "line_grid";

/**
 * 事前定義されたView構成。
 * ユーザーが選択する「テンプレート」として機能する。
 */
export interface ViewPreset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly interactionMode: InteractionMode;
  readonly defaultConfig: ViewConfig;
  readonly suggestedAffordances: readonly Affordance[];
}
