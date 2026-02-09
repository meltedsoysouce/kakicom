export type {
  HitTarget,
  HitTestEntry,
  HitTestableScene,
  SelectionRect,
  HitTestOptions,
  HitTester,
} from "./types.ts";

import type {
  SelectionRect,
} from "./types.ts";

import type { WorldPoint } from "../viewport/index.ts";

// ── HitTester 生成 ──

export { createHitTester } from "./hit-tester.ts";

// ── HitTestableScene 構築 ──

export { buildHitTestableScene } from "./scene-builder.ts";

// ── SelectionRect 操作 ──

/** ドラッグ開始点と現在点からSelectionRectを生成する。 */
export function createSelectionRect(
  start: WorldPoint,
  current: WorldPoint,
): SelectionRect {
  const x = Math.min(start.wx, current.wx);
  const y = Math.min(start.wy, current.wy);
  const width = Math.abs(current.wx - start.wx);
  const height = Math.abs(current.wy - start.wy);
  return {
    start,
    end: current,
    rect: { x, y, width, height },
  };
}

// ── バウンディングボックス算出 ──

export { computeNodeBounds, estimateTextWidth } from "./bounds.ts";

// ── 矩形ユーティリティ ──

export {
  rectContainsPoint,
  rectContainsRect,
  rectIntersects,
  expandRect,
} from "./rect-utils.ts";
