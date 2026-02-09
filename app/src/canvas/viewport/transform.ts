import type { ViewportState, WorldPoint, ScreenPoint, WorldRect, ScreenRect } from "./types.ts";

export function worldToScreen(state: ViewportState, point: WorldPoint): ScreenPoint {
  return {
    sx: (point.wx - state.camera.x) * state.camera.zoom + state.canvasSize.cssWidth / 2,
    sy: (point.wy - state.camera.y) * state.camera.zoom + state.canvasSize.cssHeight / 2,
  };
}

export function screenToWorld(state: ViewportState, point: ScreenPoint): WorldPoint {
  return {
    wx: (point.sx - state.canvasSize.cssWidth / 2) / state.camera.zoom + state.camera.x,
    wy: (point.sy - state.canvasSize.cssHeight / 2) / state.camera.zoom + state.camera.y,
  };
}

export function worldRectToScreen(state: ViewportState, rect: WorldRect): ScreenRect {
  const topLeft = worldToScreen(state, { wx: rect.x, wy: rect.y });
  const bottomRight = worldToScreen(state, { wx: rect.x + rect.width, wy: rect.y + rect.height });
  return {
    x: topLeft.sx,
    y: topLeft.sy,
    width: bottomRight.sx - topLeft.sx,
    height: bottomRight.sy - topLeft.sy,
  };
}

export function screenRectToWorld(state: ViewportState, rect: ScreenRect): WorldRect {
  const topLeft = screenToWorld(state, { sx: rect.x, sy: rect.y });
  const bottomRight = screenToWorld(state, { sx: rect.x + rect.width, sy: rect.y + rect.height });
  return {
    x: topLeft.wx,
    y: topLeft.wy,
    width: bottomRight.wx - topLeft.wx,
    height: bottomRight.wy - topLeft.wy,
  };
}

export function worldLengthToScreen(zoom: number, length: number): number {
  return length * zoom;
}

export function screenLengthToWorld(zoom: number, length: number): number {
  return length / zoom;
}
