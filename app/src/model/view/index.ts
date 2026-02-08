export type {
  ViewId,
  View,
  InteractionMode,
  InteractionModeDescriptor,
  Affordance,
  ViewConfig,
  BackgroundStyle,
  ViewPreset,
} from "./types.ts";

import type {
  View,
  InteractionMode,
  InteractionModeDescriptor,
  Affordance,
  ViewConfig,
  ViewPreset,
} from "./types.ts";

import type { ProjectionId } from "../projection/index.ts";

// ── View 生成・更新 ──

/** 新しいViewを生成する。 */
export function createView(_params: {
  name: string;
  description?: string;
  projections?: readonly ProjectionId[];
  interactionMode?: InteractionMode;
  config?: Partial<ViewConfig>;
}): View {
  throw new Error("not implemented");
}

/** ViewPresetからViewを生成する。 */
export function createViewFromPreset(
  _preset: ViewPreset,
  _projections: readonly ProjectionId[],
): View {
  throw new Error("not implemented");
}

/** Viewの一部フィールドを差し替えた新しいViewを返す。 */
export function updateView(
  _view: View,
  _patch: Partial<
    Pick<
      View,
      | "name"
      | "description"
      | "projections"
      | "interactionMode"
      | "affordances"
      | "config"
    >
  >,
): View {
  throw new Error("not implemented");
}

// ── InteractionMode 操作 ──

/** InteractionModeのDescriptorを取得する。 */
export function getModeDescriptor(
  _mode: InteractionMode,
): InteractionModeDescriptor {
  throw new Error("not implemented");
}

/** 全InteractionModeのDescriptorリストを取得する。 */
export function getAllModeDescriptors(): readonly InteractionModeDescriptor[] {
  throw new Error("not implemented");
}

/** InteractionModeに応じたデフォルトAffordanceを解決する。 */
export function resolveAffordances(
  _mode: InteractionMode,
): readonly Affordance[] {
  throw new Error("not implemented");
}

// ── Affordance 判定 ──

/** 現在のViewで特定のAffordanceが利用可能かを判定する。 */
export function hasAffordance(
  _view: View,
  _affordance: Affordance,
): boolean {
  throw new Error("not implemented");
}

/** ViewのAffordanceリストにaffordanceを追加した新しいViewを返す。 */
export function enableAffordance(
  _view: View,
  _affordance: Affordance,
): View {
  throw new Error("not implemented");
}

/** ViewのAffordanceリストからaffordanceを除去した新しいViewを返す。 */
export function disableAffordance(
  _view: View,
  _affordance: Affordance,
): View {
  throw new Error("not implemented");
}

// ── ViewConfig 操作 ──

/** デフォルトのViewConfigを生成する。 */
export function defaultViewConfig(): ViewConfig {
  throw new Error("not implemented");
}

/** ViewConfigの一部を上書きした新しいViewConfigを返す。 */
export function mergeViewConfig(
  _base: ViewConfig,
  _overrides: Partial<ViewConfig>,
): ViewConfig {
  throw new Error("not implemented");
}

// ── ViewPreset 定義 ──

/** MVP段階で提供するViewPreset一覧。 */
export const VIEW_PRESETS: readonly ViewPreset[] = [];

/** 探索View（MVPのデフォルトView）。 */
export const EXPLORE_PRESET: ViewPreset = {
  id: "explore",
  name: "探索",
  description: "自由配置、全操作可能、画像・未整理Node中心",
  interactionMode: "free_explore",
  defaultConfig: {
    background: "dot_grid",
    showDormant: false,
    showArchived: false,
    showEdges: true,
    showAnnotations: true,
    epistemicVisuals: true,
    dormancyVisuals: true,
  },
  suggestedAffordances: [
    "pan",
    "zoom",
    "select_node",
    "drag_node",
    "create_node",
    "edit_node",
    "delete_node",
    "link_nodes",
    "paste_image",
    "change_epistemic",
    "view_annotations",
    "view_edges",
    "switch_mode",
  ],
};
