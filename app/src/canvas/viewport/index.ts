export type {
  Camera,
  CanvasSize,
  WorldPoint,
  ScreenPoint,
  WorldRect,
  ScreenRect,
  ViewportState,
  ZoomConstraints,
} from "./types.ts";

import type {
  Camera,
  CanvasSize,
  WorldPoint,
  ScreenPoint,
  WorldRect,
  ScreenRect,
  ViewportState,
  ZoomConstraints,
} from "./types.ts";

// ── Camera 生成・更新 ──

/** デフォルトのCameraを生成する。原点 (0,0) を中心に、ズーム等倍。 */
export function defaultCamera(): Camera {
  throw new Error("not implemented");
}

/** Cameraにパン（平行移動）を適用する。dx, dy はワールド座標上の移動量。 */
export function pan(_camera: Camera, _dx: number, _dy: number): Camera {
  throw new Error("not implemented");
}

/** スクリーン座標上のドラッグ量からパンを適用する。 */
export function panByScreenDelta(
  _camera: Camera,
  _dsx: number,
  _dsy: number,
): Camera {
  throw new Error("not implemented");
}

/** 指定したスクリーン座標を中心にズームする。 */
export function zoomAt(
  _camera: Camera,
  _canvasSize: CanvasSize,
  _focusPoint: ScreenPoint,
  _newZoom: number,
): Camera {
  throw new Error("not implemented");
}

/** ホイールデルタからズーム量を計算し、zoomAtを適用する。 */
export function zoomByWheel(
  _camera: Camera,
  _canvasSize: CanvasSize,
  _focusPoint: ScreenPoint,
  _wheelDelta: number,
): Camera {
  throw new Error("not implemented");
}

/** 指定したWorldRectが画面内に収まるようにCamera位置とズームを調整する。 */
export function fitToRect(
  _canvasSize: CanvasSize,
  _rect: WorldRect,
  _padding?: number,
): Camera {
  throw new Error("not implemented");
}

/** 指定したWorldPointが画面中央に来るようにカメラを移動する。 */
export function centerOn(_camera: Camera, _point: WorldPoint): Camera {
  throw new Error("not implemented");
}

// ── 座標変換 ──

/** ワールド座標をスクリーン座標に変換する。 */
export function worldToScreen(
  _state: ViewportState,
  _point: WorldPoint,
): ScreenPoint {
  throw new Error("not implemented");
}

/** スクリーン座標をワールド座標に変換する。 */
export function screenToWorld(
  _state: ViewportState,
  _point: ScreenPoint,
): WorldPoint {
  throw new Error("not implemented");
}

/** ワールド座標の矩形をスクリーン座標の矩形に変換する。 */
export function worldRectToScreen(
  _state: ViewportState,
  _rect: WorldRect,
): ScreenRect {
  throw new Error("not implemented");
}

/** スクリーン座標の矩形をワールド座標の矩形に変換する。 */
export function screenRectToWorld(
  _state: ViewportState,
  _rect: ScreenRect,
): WorldRect {
  throw new Error("not implemented");
}

/** ワールド座標の長さをスクリーン座標の長さに変換する。 */
export function worldLengthToScreen(_zoom: number, _length: number): number {
  throw new Error("not implemented");
}

/** スクリーン座標の長さをワールド座標の長さに変換する。 */
export function screenLengthToWorld(_zoom: number, _length: number): number {
  throw new Error("not implemented");
}

// ── ビューポートクエリ ──

/** 現在カメラが見ているワールド座標上の矩形を返す。 */
export function getVisibleWorldRect(_state: ViewportState): WorldRect {
  throw new Error("not implemented");
}

/** 指定したWorldPointがビューポート内に見えているかを判定する。 */
export function isPointVisible(
  _state: ViewportState,
  _point: WorldPoint,
): boolean {
  throw new Error("not implemented");
}

/** 指定したWorldRectがビューポートと交差しているかを判定する。 */
export function isRectVisible(
  _state: ViewportState,
  _rect: WorldRect,
): boolean {
  throw new Error("not implemented");
}

// ── CanvasSize 管理 ──

/** Canvas要素の現在サイズからCanvasSizeを生成する。 */
export function measureCanvasSize(_canvas: HTMLCanvasElement): CanvasSize {
  throw new Error("not implemented");
}

/** Canvas要素の物理ピクセルサイズをCanvasSizeに合わせて設定する。 */
export function applyCanvasSize(
  _canvas: HTMLCanvasElement,
  _size: CanvasSize,
): void {
  throw new Error("not implemented");
}

// ── 定数 ──

/** デフォルトのズーム制約。 */
export const DEFAULT_ZOOM_CONSTRAINTS: ZoomConstraints = {
  min: 0.1,
  max: 5.0,
  step: 0.1,
};

/** ズーム制約内にズーム値をクランプする。 */
export function clampZoom(
  _zoom: number,
  _constraints?: ZoomConstraints,
): number {
  throw new Error("not implemented");
}
