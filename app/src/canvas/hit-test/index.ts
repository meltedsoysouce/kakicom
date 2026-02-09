export type {
  HitTarget,
  HitTestEntry,
  HitTestableScene,
  SelectionRect,
  HitTestOptions,
  HitTester,
} from "./types.ts";

import type {
  HitTestableScene,
  HitTestOptions,
  HitTester,
  SelectionRect,
} from "./types.ts";

import type { WorldPoint, WorldRect } from "../viewport/index.ts";
import type { Node } from "../../model/node/index.ts";
import type { RenderableNode, NodeStyle } from "../renderer/index.ts";

// ── HitTester 生成 ──

/** HitTesterを生成する。 */
export function createHitTester(
  _options?: Partial<HitTestOptions>,
): HitTester {
  throw new Error("not implemented");
}

// ── HitTestableScene 構築 ──

/** RenderableNode配列からHitTestableSceneを構築する。 */
export function buildHitTestableScene(
  _nodes: readonly RenderableNode[],
): HitTestableScene {
  throw new Error("not implemented");
}

// ── SelectionRect 操作 ──

/** ドラッグ開始点と現在点からSelectionRectを生成する。 */
export function createSelectionRect(
  _start: WorldPoint,
  _current: WorldPoint,
): SelectionRect {
  throw new Error("not implemented");
}

// ── バウンディングボックス算出 ──

/** Node のPayloadとスタイルからバウンディングボックスのサイズを算出する。 */
export function computeNodeBounds(
  _node: Node,
  _position: WorldPoint,
  _style: NodeStyle,
): WorldRect {
  throw new Error("not implemented");
}

/** テキストの描画幅を推定する。Canvas 2D の measureText に依存しない近似値。 */
export function estimateTextWidth(
  _text: string,
  _fontSize: number,
): number {
  throw new Error("not implemented");
}

// ── 矩形ユーティリティ ──

/** 点が矩形内に含まれるかを判定する。 */
export function rectContainsPoint(
  _rect: WorldRect,
  _point: WorldPoint,
): boolean {
  throw new Error("not implemented");
}

/** 矩形Aが矩形Bを完全に包含するかを判定する。 */
export function rectContainsRect(
  _outer: WorldRect,
  _inner: WorldRect,
): boolean {
  throw new Error("not implemented");
}

/** 二つの矩形が交差するかを判定する。 */
export function rectIntersects(
  _a: WorldRect,
  _b: WorldRect,
): boolean {
  throw new Error("not implemented");
}

/** マージンを考慮して矩形を拡張する。 */
export function expandRect(
  _rect: WorldRect,
  _margin: number,
): WorldRect {
  throw new Error("not implemented");
}
