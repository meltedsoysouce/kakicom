# canvas/viewport/ — ビューポートコンポーネント

## 1. 概要

本コンポーネントは無限キャンバスの**カメラ制御と座標変換**を担当する。
ユーザーのパン・ズーム操作をカメラ状態の変更として処理し、
ワールド座標 ⇔ スクリーン座標の双方向変換を提供する。

canvas/ 内の他コンポーネント（renderer/, hit-test/, input/）は
すべてviewport/ の座標変換を経由してワールド座標系にアクセスする。

---

## 2. 責務

- Camera 状態の保持と更新
- パン操作（カメラ位置の移動）
- ズーム操作（カーソル中心のスケール変更）
- ワールド座標 → スクリーン座標の変換（描画用）
- スクリーン座標 → ワールド座標の変換（入力処理用）
- ビューポート矩形の算出（現在見えているワールド領域）
- Canvas要素のリサイズ対応

### 責務に含まれないもの

- 実際の描画（→ renderer/）
- DOM入力イベントの受付（→ input/）
- Nodeの空間的配置判定（→ hit-test/）

---

## 3. 設計原則

1. **レンダリングAPI非依存** — Canvas 2D / WebGPU どちらでも使える座標変換
2. **カメラ中心設計** — 全空間操作はCamera状態の変更に集約する
3. **ズームはカーソル中心** — ユーザーが注視している点を固定してズームする
4. **状態は不変オブジェクト** — Camera更新は新しいCameraの返却で表現する

---

## 4. 公開データ構造

### 4.1 Camera

```typescript
/**
 * カメラの状態。
 * ワールド座標上の「見ている位置」と「倍率」を保持する。
 *
 * (x, y) はカメラの中心がワールド座標上のどこにあるかを示す。
 * zoom はスケール倍率。1.0で等倍。
 */
interface Camera {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}
```

### 4.2 CanvasSize

```typescript
/**
 * Canvas要素の物理サイズ。
 * CSSピクセルと物理ピクセル（devicePixelRatio考慮）の両方を保持する。
 */
interface CanvasSize {
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
```

### 4.3 WorldPoint / ScreenPoint

```typescript
/**
 * ワールド座標上の点。
 * Nodeの配置位置やProjectionの出力座標はこの型で表現する。
 */
interface WorldPoint {
  readonly wx: number;
  readonly wy: number;
}

/**
 * スクリーン座標上の点。
 * マウスイベント座標やCanvas上の描画位置はこの型で表現する。
 */
interface ScreenPoint {
  readonly sx: number;
  readonly sy: number;
}
```

### 4.4 WorldRect / ScreenRect

```typescript
/**
 * ワールド座標上の矩形。
 * Nodeのバウンディングボックスやビューポート領域を表現する。
 */
interface WorldRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * スクリーン座標上の矩形。
 */
interface ScreenRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
```

### 4.5 ViewportState

```typescript
/**
 * ビューポートの完全な状態。
 * CameraとCanvasSizeを統合し、座標変換に必要な情報をすべて保持する。
 */
interface ViewportState {
  readonly camera: Camera;
  readonly canvasSize: CanvasSize;
}
```

### 4.6 ZoomConstraints

```typescript
/**
 * ズームレベルの制約。
 */
interface ZoomConstraints {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}
```

---

## 5. 公開インターフェース

### 5.1 Camera 生成・更新

```typescript
/**
 * デフォルトのCameraを生成する。
 * 原点 (0,0) を中心に、ズーム等倍。
 */
function defaultCamera(): Camera;

/**
 * Cameraにパン（平行移動）を適用する。
 * dx, dy はワールド座標上の移動量。
 */
function pan(camera: Camera, dx: number, dy: number): Camera;

/**
 * スクリーン座標上のドラッグ量からパンを適用する。
 * ズームレベルを考慮してワールド座標に変換する。
 */
function panByScreenDelta(
  camera: Camera,
  dsx: number,
  dsy: number
): Camera;

/**
 * 指定したスクリーン座標を中心にズームする。
 * ズーム後もfocusPointのワールド座標が変わらないように調整する。
 */
function zoomAt(
  camera: Camera,
  canvasSize: CanvasSize,
  focusPoint: ScreenPoint,
  newZoom: number
): Camera;

/**
 * ホイールデルタからズーム量を計算し、zoomAtを適用する。
 */
function zoomByWheel(
  camera: Camera,
  canvasSize: CanvasSize,
  focusPoint: ScreenPoint,
  wheelDelta: number
): Camera;

/**
 * 指定したWorldRectが画面内に収まるようにCamera位置とズームを調整する。
 * パディング付き。
 */
function fitToRect(
  canvasSize: CanvasSize,
  rect: WorldRect,
  padding?: number
): Camera;

/**
 * 指定したWorldPointが画面中央に来るようにカメラを移動する。
 */
function centerOn(camera: Camera, point: WorldPoint): Camera;
```

### 5.2 座標変換

```typescript
/**
 * ワールド座標をスクリーン座標に変換する。
 */
function worldToScreen(
  state: ViewportState,
  point: WorldPoint
): ScreenPoint;

/**
 * スクリーン座標をワールド座標に変換する。
 */
function screenToWorld(
  state: ViewportState,
  point: ScreenPoint
): WorldPoint;

/**
 * ワールド座標の矩形をスクリーン座標の矩形に変換する。
 */
function worldRectToScreen(
  state: ViewportState,
  rect: WorldRect
): ScreenRect;

/**
 * スクリーン座標の矩形をワールド座標の矩形に変換する。
 */
function screenRectToWorld(
  state: ViewportState,
  rect: ScreenRect
): WorldRect;

/**
 * ワールド座標の長さをスクリーン座標の長さに変換する。
 * （zoom倍率を掛けるだけ）
 */
function worldLengthToScreen(zoom: number, length: number): number;

/**
 * スクリーン座標の長さをワールド座標の長さに変換する。
 */
function screenLengthToWorld(zoom: number, length: number): number;
```

### 5.3 ビューポートクエリ

```typescript
/**
 * 現在カメラが見ているワールド座標上の矩形を返す。
 */
function getVisibleWorldRect(state: ViewportState): WorldRect;

/**
 * 指定したWorldPointがビューポート内に見えているかを判定する。
 */
function isPointVisible(state: ViewportState, point: WorldPoint): boolean;

/**
 * 指定したWorldRectがビューポートと交差しているかを判定する。
 */
function isRectVisible(state: ViewportState, rect: WorldRect): boolean;
```

### 5.4 CanvasSize 管理

```typescript
/**
 * Canvas要素の現在サイズからCanvasSizeを生成する。
 */
function measureCanvasSize(canvas: HTMLCanvasElement): CanvasSize;

/**
 * Canvas要素の物理ピクセルサイズをCanvasSizeに合わせて設定する。
 * 高DPIディスプレイ対応。
 */
function applyCanvasSize(
  canvas: HTMLCanvasElement,
  size: CanvasSize
): void;
```

### 5.5 定数

```typescript
/**
 * デフォルトのズーム制約。
 */
const DEFAULT_ZOOM_CONSTRAINTS: ZoomConstraints;
// { min: 0.1, max: 5.0, step: 0.1 }

/**
 * ズーム制約内にズーム値をクランプする。
 */
function clampZoom(zoom: number, constraints?: ZoomConstraints): number;
```

---

## 6. ファイル構成（想定）

```
canvas/viewport/
├── COMPONENT.md       # 本ドキュメント
├── types.ts           # Camera, CanvasSize, WorldPoint, ScreenPoint, WorldRect, ScreenRect
├── camera.ts          # defaultCamera, pan, zoomAt, zoomByWheel, fitToRect, centerOn
├── transform.ts       # worldToScreen, screenToWorld, worldRectToScreen 等
├── query.ts           # getVisibleWorldRect, isPointVisible, isRectVisible
├── canvas-size.ts     # measureCanvasSize, applyCanvasSize
└── index.ts           # 公開APIの再エクスポート
```

---

## 7. 依存関係

```
canvas/viewport/ → (依存なし)
```

viewport/ はcanvas/内で最も基底のコンポーネントであり、
model/ にすら依存しない。純粋な数学的変換のみを提供する。

canvas/内の他コンポーネントはすべてviewport/に依存する:
- renderer/ → viewport/ (描画位置の算出)
- hit-test/ → viewport/ (クリック位置の変換)
- input/ → viewport/ (入力座標の変換、パン・ズーム操作)

---

## 8. 不変条件

1. **Camera.zoom は ZoomConstraints.min 以上 ZoomConstraints.max 以下**
2. **worldToScreen と screenToWorld は可逆**（誤差を除き逆関数の関係）
3. **zoomAt 後、focusPoint のワールド座標は変わらない**
4. **CanvasSize.physicalWidth === CanvasSize.cssWidth * CanvasSize.dpr**
5. **パン操作はzoomレベルに影響しない**
6. **ズーム操作はカメラ位置に影響する**（focusPoint固定のため）

---

## 9. 座標変換の数学的定義

### ワールド → スクリーン

```
screen_x = (world_x - camera.x) * camera.zoom + canvasSize.cssWidth  / 2
screen_y = (world_y - camera.y) * camera.zoom + canvasSize.cssHeight / 2
```

### スクリーン → ワールド

```
world_x = (screen_x - canvasSize.cssWidth  / 2) / camera.zoom + camera.x
world_y = (screen_y - canvasSize.cssHeight / 2) / camera.zoom + camera.y
```

### ズーム（focusPoint中心）

```
old_world = screenToWorld(state, focusPoint)
camera.zoom = newZoom
new_world = screenToWorld(state, focusPoint)  // zoom変更後に再計算
camera.x += old_world.wx - new_world.wx
camera.y += old_world.wy - new_world.wy
```

この補正により、focusPointのスクリーン座標が
ズーム前後で同じワールド座標を指し続ける。
