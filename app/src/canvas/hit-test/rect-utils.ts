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

/** 点から線分への最短距離を計算する。 */
export function distanceToSegment(
  point: WorldPoint,
  a: WorldPoint,
  b: WorldPoint,
): number {
  const dx = b.wx - a.wx;
  const dy = b.wy - a.wy;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    // a と b が同一点
    const ex = point.wx - a.wx;
    const ey = point.wy - a.wy;
    return Math.sqrt(ex * ex + ey * ey);
  }
  // 線分上の最近接点のパラメータ t を算出（0〜1にクランプ）
  const t = Math.max(0, Math.min(1, ((point.wx - a.wx) * dx + (point.wy - a.wy) * dy) / lenSq));
  const projX = a.wx + t * dx;
  const projY = a.wy + t * dy;
  const ex = point.wx - projX;
  const ey = point.wy - projY;
  return Math.sqrt(ex * ex + ey * ey);
}
