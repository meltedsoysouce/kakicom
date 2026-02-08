/**
 * カメラの状態。
 * ワールド座標上の「見ている位置」と「倍率」を保持する。
 *
 * (x, y) はカメラの中心がワールド座標上のどこにあるかを示す。
 * zoom はスケール倍率。1.0で等倍。
 */
export interface Camera {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

/**
 * Canvas要素の物理サイズ。
 * CSSピクセルと物理ピクセル（devicePixelRatio考慮）の両方を保持する。
 */
export interface CanvasSize {
  /** CSSピクセル単位の幅 */
  readonly cssWidth: number;
  /** CSSピクセル単位の高さ */
  readonly cssHeight: number;
  /** devicePixelRatio */
  readonly dpr: number;
  /** 物理ピクセル幅 (cssWidth * dpr) */
  readonly physicalWidth: number;
  /** 物理ピクセル高さ (cssHeight * dpr) */
  readonly physicalHeight: number;
}

/**
 * ワールド座標上の点。
 * Nodeの配置位置やProjectionの出力座標はこの型で表現する。
 */
export interface WorldPoint {
  readonly wx: number;
  readonly wy: number;
}

/**
 * スクリーン座標上の点。
 * マウスイベント座標やCanvas上の描画位置はこの型で表現する。
 */
export interface ScreenPoint {
  readonly sx: number;
  readonly sy: number;
}

/**
 * ワールド座標上の矩形。
 * Nodeのバウンディングボックスやビューポート領域を表現する。
 */
export interface WorldRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * スクリーン座標上の矩形。
 */
export interface ScreenRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * ビューポートの完全な状態。
 * CameraとCanvasSizeを統合し、座標変換に必要な情報をすべて保持する。
 */
export interface ViewportState {
  readonly camera: Camera;
  readonly canvasSize: CanvasSize;
}

/**
 * ズームレベルの制約。
 */
export interface ZoomConstraints {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}
