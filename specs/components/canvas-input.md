# canvas/input MVP実装仕様

## 概要

マウスイベントをInputActionに変換する。
MVP では マウス操作のみ。タッチ / キーボード / ペーストはスキップ。

## 作成ファイル

```
app/src/canvas/input/
├── types.ts            # 変更不要
├── input-handler.ts    # InputHandler 実装
├── drag-machine.ts     # DragState ステートマシン
└── index.ts            # 各ファイルから re-export
```

## MVPで発行するInputAction

| Action | トリガー |
|---|---|
| `PanAction` | 背景ドラッグ |
| `PanEndAction` | 背景ドラッグ終了 |
| `ZoomAction` | ホイール |
| `NodeClickAction` | Node上でクリック（移動量 < threshold） |
| `NodeDoubleClickAction` | Node上でダブルクリック |
| `NodeDragStartAction` | Node上でドラッグ開始 |
| `NodeDragMoveAction` | Nodeドラッグ中 |
| `NodeDragEndAction` | Nodeドラッグ終了 |
| `BackgroundClickAction` | 背景クリック |
| `BackgroundDoubleClickAction` | 背景ダブルクリック |

### MVPで発行しないAction

- `RectSelectStart/Move/End` — 矩形選択なし
- `PasteAction` — ペーストなし
- `HoverAction` — ホバー表示なし
- `KeyAction` — キーボードショートカットなし

## DragState ステートマシン

```
         mousedown
            │
    ┌───────┼───────┐
    │       │       │
  背景    Node     (右ボタン等は無視)
    │       │
    ▼       ▼
 Panning  (pending) ←── 移動量 < threshold の間
    │       │
mousemove  移動量 >= threshold
    │       │
    ▼       ▼
 PanAction DraggingNode
    │       │
mouseup   mouseup
    │       │
    ▼       ▼
PanEndAction NodeDragEndAction
    │
    ▼
  Idle

  (pending) + mouseup(移動量 < threshold) → NodeClickAction
  (pending) + dblclick → NodeDoubleClickAction
  背景 + mouseup(移動量 < threshold) → BackgroundClickAction
  背景 + dblclick → BackgroundDoubleClickAction
```

## 実装詳細

### drag-machine.ts

```typescript
interface DragMachineState {
  drag: DragState;
  pendingTarget: HitTarget | null;  // クリック判定用
  mousedownScreen: ScreenPoint | null;
}

function createDragMachine() {
  const state: DragMachineState = {
    drag: { type: "idle" },
    pendingTarget: null,
    mousedownScreen: null,
  };

  return {
    getState(): DragState { return state.drag; },

    onMouseDown(screenPoint, worldPoint, hitTarget) {
      state.mousedownScreen = screenPoint;
      state.pendingTarget = hitTarget;

      if (hitTarget.type === "node") {
        // まだドラッグ開始しない（threshold判定はmousemoveで）
        state.drag = { type: "idle" };
      } else {
        // 背景→パン開始（即座に）
        state.drag = {
          type: "panning",
          startScreen: screenPoint,
          lastScreen: screenPoint,
        };
      }
    },

    onMouseMove(screenPoint, worldPoint, threshold): InputAction | null {
      // ... threshold超え判定 → DragState遷移 → Action発行
    },

    onMouseUp(screenPoint, worldPoint): InputAction | null {
      // ... 状態に応じた終了Action発行 → idle復帰
    },
  };
}
```

### input-handler.ts

```typescript
function createInputHandler(params: InputHandlerParams): InputHandler {
  const { viewport, hitTester } = params;
  let callback: ((action: InputAction) => void) | null = null;
  let canvas: HTMLCanvasElement | null = null;
  const machine = createDragMachine();

  function emit(action: InputAction) {
    callback?.(action);
  }

  function getWorldPoint(e: MouseEvent): WorldPoint {
    const rect = canvas!.getBoundingClientRect();
    const screenPoint: ScreenPoint = {
      sx: e.clientX - rect.left,
      sy: e.clientY - rect.top,
    };
    return screenToWorld(viewport, screenPoint);
  }

  // イベントハンドラ
  function onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;  // 左ボタンのみ
    const world = getWorldPoint(e);
    const screen = { sx: e.clientX, sy: e.clientY };
    const hit = hitTester.hitTestPoint(world);
    machine.onMouseDown(screen, world, hit);
  }

  function onMouseMove(e: MouseEvent) {
    const world = getWorldPoint(e);
    const screen = { sx: e.clientX, sy: e.clientY };
    const action = machine.onMouseMove(screen, world, config.dragThreshold);
    if (action) emit(action);
  }

  function onMouseUp(e: MouseEvent) {
    const world = getWorldPoint(e);
    const screen = { sx: e.clientX, sy: e.clientY };
    const action = machine.onMouseUp(screen, world);
    if (action) emit(action);
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const rect = canvas!.getBoundingClientRect();
    emit({
      type: "zoom",
      focusScreen: { sx: e.clientX - rect.left, sy: e.clientY - rect.top },
      delta: e.deltaY,
    });
  }

  function onDblClick(e: MouseEvent) {
    const world = getWorldPoint(e);
    const hit = hitTester.hitTestPoint(world);
    if (hit.type === "node") {
      emit({ type: "node_double_click", nodeId: hit.nodeId, worldPoint: world });
    } else {
      emit({ type: "background_double_click", worldPoint: world });
    }
  }

  return {
    attach(c) {
      canvas = c;
      canvas.addEventListener("mousedown", onMouseDown);
      canvas.addEventListener("mousemove", onMouseMove);
      canvas.addEventListener("mouseup", onMouseUp);
      canvas.addEventListener("wheel", onWheel, { passive: false });
      canvas.addEventListener("dblclick", onDblClick);
    },
    detach() {
      // removeEventListener 全て
    },
    onAction(cb) { callback = cb; },
    getDragState() { return machine.getState(); },
    setAffordances() { /* MVP: 無視（全操作許可） */ },
    setConfig(c) { Object.assign(config, c); },
  };
}
```

## 重要な実装ノート

### viewport の参照は mutable にする

`createInputHandler` の `params.viewport` は `ViewportState` の **参照** を受け取るが、
カメラが更新されるたびに最新の `ViewportState` で座標変換する必要がある。

**方法1:** `params` にゲッター関数を渡す

```typescript
// 呼び出し側
createInputHandler({
  viewport: () => currentViewportState,
  hitTester,
});
```

**方法2:** `InputHandlerParams` の `viewport` を `ViewportState` のままにし、
`setViewport(state)` メソッドを InputHandler に追加する。

→ MVP では **方法2** を推奨（types.ts への追加が最小限）。
`InputHandler` インターフェースに `setViewport` を追加してよい。

### ダブルクリックの処理

ブラウザの `dblclick` イベントを使う（自前タイマー不要）。
ただし `mousedown` → `mouseup` → `click` → `mousedown` → `mouseup` → `click` → `dblclick`
の順でイベントが来るため、click と dblclick の競合に注意する。

**簡易的な対策:** dblclick イベントで処理し、click は無視する。
NodeClickAction / BackgroundClickAction は mouseup で発行する。

## テスト基準

- 背景ドラッグで PanAction が発行される
- Node上ドラッグで NodeDragMoveAction が発行される
- Node上クリック（移動量小）で NodeClickAction が発行される
- ホイールで ZoomAction が発行される
- 背景ダブルクリックで BackgroundDoubleClickAction が発行される
