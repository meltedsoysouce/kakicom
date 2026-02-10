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
  EpistemicVisualMap,
  DormancyVisualMap,
} from "./types.ts";

// ── Renderer 生成 ──

export { createRenderer } from "./renderer.ts";

// ── テーマ ──

export { DARK_THEME, LIGHT_THEME } from "./theme.ts";

// ── RenderScene 構築補助 ──

export { toRenderableNode, emptyScene } from "./scene-builder.ts";

// ── EpistemicVisual / DormancyVisual デフォルト ──

/** デフォルトのEpistemicVisualMapを返す。 */
export function defaultEpistemicVisuals(): EpistemicVisualMap {
  return {
    certain: { opacity: 1.0, strokeDash: [], strokeWidthMultiplier: 1.0 },
    likely: { opacity: 0.9, strokeDash: [], strokeWidthMultiplier: 1.0 },
    hypothesis: { opacity: 0.8, strokeDash: [4, 4], strokeWidthMultiplier: 1.0 },
    speculative: { opacity: 0.6, strokeDash: [2, 4], strokeWidthMultiplier: 0.8 },
    unsure: { opacity: 0.5, strokeDash: [1, 3], strokeWidthMultiplier: 0.6 },
  };
}

/** デフォルトのDormancyVisualMapを返す。 */
export function defaultDormancyVisuals(): DormancyVisualMap {
  return {
    active: { opacity: 1.0, scaleMultiplier: 1.0, visible: true },
    cooling: { opacity: 0.7, scaleMultiplier: 0.95, visible: true },
    dormant: { opacity: 0.4, scaleMultiplier: 0.9, visible: true },
    archived: { opacity: 0.2, scaleMultiplier: 0.85, visible: false },
  };
}
