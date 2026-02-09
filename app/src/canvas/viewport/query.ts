import type { ViewportState, WorldPoint, WorldRect } from "./types.ts";
import { screenToWorld } from "./transform.ts";

export function getVisibleWorldRect(state: ViewportState): WorldRect {
  const topLeft = screenToWorld(state, { sx: 0, sy: 0 });
  const { cssWidth, cssHeight } = state.canvasSize;
  const bottomRight = screenToWorld(state, { sx: cssWidth, sy: cssHeight });
  return {
    x: topLeft.wx,
    y: topLeft.wy,
    width: bottomRight.wx - topLeft.wx,
    height: bottomRight.wy - topLeft.wy,
  };
}

export function isPointVisible(state: ViewportState, point: WorldPoint): boolean {
  const rect = getVisibleWorldRect(state);
  return (
    point.wx >= rect.x &&
    point.wx <= rect.x + rect.width &&
    point.wy >= rect.y &&
    point.wy <= rect.y + rect.height
  );
}

export function isRectVisible(state: ViewportState, rect: WorldRect): boolean {
  const visible = getVisibleWorldRect(state);
  return !(
    rect.x + rect.width < visible.x ||
    rect.x > visible.x + visible.width ||
    rect.y + rect.height < visible.y ||
    rect.y > visible.y + visible.height
  );
}
