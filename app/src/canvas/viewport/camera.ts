import type { Camera, CanvasSize, ScreenPoint, WorldPoint, WorldRect, ZoomConstraints } from "./types.ts";
import { screenToWorld } from "./transform.ts";

const DEFAULT_CONSTRAINTS: ZoomConstraints = {
  min: 0.1,
  max: 5.0,
  step: 0.1,
};

export function clampZoom(zoom: number, constraints: ZoomConstraints = DEFAULT_CONSTRAINTS): number {
  return Math.min(Math.max(zoom, constraints.min), constraints.max);
}

export function defaultCamera(): Camera {
  return { x: 0, y: 0, zoom: 1.0 };
}

export function pan(camera: Camera, dx: number, dy: number): Camera {
  return { ...camera, x: camera.x + dx, y: camera.y + dy };
}

export function panByScreenDelta(camera: Camera, dsx: number, dsy: number): Camera {
  return pan(camera, -dsx / camera.zoom, -dsy / camera.zoom);
}

export function zoomAt(
  camera: Camera,
  canvasSize: CanvasSize,
  focusPoint: ScreenPoint,
  newZoom: number,
): Camera {
  const clamped = clampZoom(newZoom);
  const state = { camera, canvasSize };
  const oldWorld = screenToWorld(state, focusPoint);
  const newCamera = { ...camera, zoom: clamped };
  const newState = { camera: newCamera, canvasSize };
  const newWorld = screenToWorld(newState, focusPoint);
  return {
    x: newCamera.x + (oldWorld.wx - newWorld.wx),
    y: newCamera.y + (oldWorld.wy - newWorld.wy),
    zoom: clamped,
  };
}

export function zoomByWheel(
  camera: Camera,
  canvasSize: CanvasSize,
  focusPoint: ScreenPoint,
  wheelDelta: number,
): Camera {
  const factor = 1 - wheelDelta * 0.001;
  return zoomAt(camera, canvasSize, focusPoint, camera.zoom * factor);
}

export function fitToRect(canvasSize: CanvasSize, rect: WorldRect, padding: number = 50): Camera {
  const scaleX = (canvasSize.cssWidth - padding * 2) / rect.width;
  const scaleY = (canvasSize.cssHeight - padding * 2) / rect.height;
  const zoom = clampZoom(Math.min(scaleX, scaleY));
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
    zoom,
  };
}

export function centerOn(camera: Camera, point: WorldPoint): Camera {
  return { ...camera, x: point.wx, y: point.wy };
}
