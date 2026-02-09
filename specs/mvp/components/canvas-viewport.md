# canvas/viewport MVP実装仕様

## 概要

座標変換とカメラ制御。全て純粋関数（DOM依存は2関数のみ）。
`index.ts` のスタブ関数を全て実装する。

## 作成ファイル

```
app/src/canvas/viewport/
├── types.ts          # 変更不要
├── camera.ts         # defaultCamera, pan, panByScreenDelta, zoomAt, zoomByWheel, fitToRect, centerOn
├── transform.ts      # worldToScreen, screenToWorld, worldRectToScreen, screenRectToWorld, worldLengthToScreen, screenLengthToWorld
├── query.ts          # getVisibleWorldRect, isPointVisible, isRectVisible
├── canvas-size.ts    # measureCanvasSize, applyCanvasSize
└── index.ts          # 各ファイルから re-export
```

## 座標変換の数式

COMPONENT.md セクション9 に定義済み。そのまま実装する:

### ワールド → スクリーン

```
sx = (wx - camera.x) * camera.zoom + canvasSize.cssWidth  / 2
sy = (wy - camera.y) * camera.zoom + canvasSize.cssHeight / 2
```

### スクリーン → ワールド

```
wx = (sx - canvasSize.cssWidth  / 2) / camera.zoom + camera.x
wy = (sy - canvasSize.cssHeight / 2) / camera.zoom + camera.y
```

### ズーム（focusPoint中心）

```
1. old_world = screenToWorld(state, focusPoint)
2. camera.zoom = newZoom  (clamp済み)
3. new_world = screenToWorld(updated_state, focusPoint)
4. camera.x += old_world.wx - new_world.wx
5. camera.y += old_world.wy - new_world.wy
```

## 実装詳細

### camera.ts

```typescript
function defaultCamera(): Camera {
  return { x: 0, y: 0, zoom: 1.0 };
}

function pan(camera, dx, dy): Camera {
  return { ...camera, x: camera.x + dx, y: camera.y + dy };
}

function panByScreenDelta(camera, dsx, dsy): Camera {
  // スクリーン上のドラッグ量をワールド座標に変換
  return pan(camera, -dsx / camera.zoom, -dsy / camera.zoom);
}

function zoomAt(camera, canvasSize, focusPoint, newZoom): Camera {
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

function zoomByWheel(camera, canvasSize, focusPoint, wheelDelta): Camera {
  const factor = 1 - wheelDelta * 0.001;
  return zoomAt(camera, canvasSize, focusPoint, camera.zoom * factor);
}

function fitToRect(canvasSize, rect, padding = 50): Camera {
  const scaleX = (canvasSize.cssWidth - padding * 2) / rect.width;
  const scaleY = (canvasSize.cssHeight - padding * 2) / rect.height;
  const zoom = clampZoom(Math.min(scaleX, scaleY));
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
    zoom,
  };
}

function centerOn(camera, point): Camera {
  return { ...camera, x: point.wx, y: point.wy };
}
```

### query.ts

```typescript
function getVisibleWorldRect(state): WorldRect {
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
```

### canvas-size.ts

```typescript
function measureCanvasSize(canvas: HTMLCanvasElement): CanvasSize {
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  return {
    cssWidth, cssHeight, dpr,
    physicalWidth: cssWidth * dpr,
    physicalHeight: cssHeight * dpr,
  };
}

function applyCanvasSize(canvas, size): void {
  canvas.width = size.physicalWidth;
  canvas.height = size.physicalHeight;
}
```

## テスト基準

- `worldToScreen` → `screenToWorld` の往復が元の値に戻る
- `zoomAt` 後に focusPoint のワールド座標が変わらない
- `panByScreenDelta` でカメラが正しい方向に移動する
- `clampZoom(0.01)` が `0.1` を返す（min制約）
