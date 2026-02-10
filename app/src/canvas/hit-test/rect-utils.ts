import type { WorldRect, WorldPoint } from "../viewport/index.ts";

/** 点が矩形内に含まれるかを判定する。 */
export function rectContainsPoint(rect: WorldRect, point: WorldPoint): boolean {
  return (
    point.wx >= rect.x &&
    point.wx <= rect.x + rect.width &&
    point.wy >= rect.y &&
    point.wy <= rect.y + rect.height
  );
}

/** 矩形Aが矩形Bを完全に包含するかを判定する。 */
export function rectContainsRect(outer: WorldRect, inner: WorldRect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

/** 二つの矩形が交差するかを判定する。 */
export function rectIntersects(a: WorldRect, b: WorldRect): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

/** マージンを考慮して矩形を拡張する。 */
export function expandRect(rect: WorldRect, margin: number): WorldRect {
  return {
    x: rect.x - margin,
    y: rect.y - margin,
    width: rect.width + margin * 2,
    height: rect.height + margin * 2,
  };
}
