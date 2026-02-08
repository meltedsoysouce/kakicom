export type {
  RenderContext,
  RenderTheme,
  NodeStyle,
  EpistemicVisualMap,
  EpistemicVisual,
  DormancyVisualMap,
  DormancyVisual,
  EdgeStyle,
  AnnotationStyle,
  RenderableNode,
  RenderableEdge,
  RenderableAnnotation,
  RenderScene,
  RenderStats,
  Renderer,
} from "./types.ts";

import type {
  RenderTheme,
  RenderableNode,
  RenderScene,
  Renderer,
  EpistemicVisualMap,
  DormancyVisualMap,
} from "./types.ts";

import type { Node } from "../../model/node/index.ts";
import type { WorldPoint } from "../viewport/index.ts";
import type { DormancyState } from "../../model/meta/index.ts";

// ── Renderer 生成 ──

/** Canvas 2D Rendererを生成する。 */
export function createRenderer(_options?: {
  theme?: RenderTheme;
}): Renderer {
  throw new Error("not implemented");
}

// ── テーマ ──

/** ダークテーマ（デフォルト）。 */
export const DARK_THEME: RenderTheme = undefined as unknown as RenderTheme;

/** ライトテーマ。 */
export const LIGHT_THEME: RenderTheme = undefined as unknown as RenderTheme;

/** デフォルトのEpistemicVisualMapを返す。 */
export function defaultEpistemicVisuals(): EpistemicVisualMap {
  throw new Error("not implemented");
}

/** デフォルトのDormancyVisualMapを返す。 */
export function defaultDormancyVisuals(): DormancyVisualMap {
  throw new Error("not implemented");
}

// ── RenderScene 構築補助 ──

/** model/ のデータからRenderableNodeを構築する。 */
export function toRenderableNode(_params: {
  node: Node;
  position: WorldPoint;
  dormancyState: DormancyState;
  selected: boolean;
  hovered: boolean;
}): RenderableNode {
  throw new Error("not implemented");
}

/** 空のRenderSceneを生成する。 */
export function emptyScene(): RenderScene {
  throw new Error("not implemented");
}
