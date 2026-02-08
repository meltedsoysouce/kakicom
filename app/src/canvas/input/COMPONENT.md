# canvas/input/ — 入力処理コンポーネント

## 1. 概要

本コンポーネントはDOM入力イベント（マウス・タッチ・キーボード）を受け取り、
アプリケーションが理解できる**意味的なアクション**に変換する。

「左ボタンをドラッグした」というDOMイベントを、
「背景をパンした」「Nodeを移動した」「矩形選択した」という
コンテキスト依存のアクションに解釈するのが本コンポーネントの役割である。

---

## 2. 責務

- DOM入力イベント（mouse, wheel, touch, keyboard, paste）のリスニング
- ドラッグ状態のトラッキング（開始・移動・終了）
- ヒットテスト結果に基づくドラッグ対象の判定
- InteractionMode / Affordance に応じた入力の解釈切替
- 意味的なInputActionへの変換と外部通知
- クリップボード（ペースト）イベントの処理

### 責務に含まれないもの

- 座標変換（→ viewport/）
- ヒットテストの実行（→ hit-test/ — input/から呼び出す）
- 描画（→ renderer/）
- InputActionに基づくドメイン操作の実行（→ 上位層）

---

## 3. 設計原則

1. **DOMイベントをここで吸収する** — DOM APIへの依存をinput/に閉じ込める
2. **InputActionは宣言的** — 「何が起きたか」を記述し「何をするか」は上位が決める
3. **Affordanceで操作を制約する** — 許可されていない操作のActionは発行しない
4. **ドラッグ状態はステートマシン** — 明確な状態遷移で管理する

---

## 4. 公開データ構造

### 4.1 InputAction

```typescript
/**
 * DOM入力イベントから変換された意味的アクション。
 * 上位層はInputActionのみを処理し、DOMイベントを直接扱わない。
 */
type InputAction =
  | PanAction
  | PanEndAction
  | ZoomAction
  | NodeClickAction
  | NodeDoubleClickAction
  | NodeDragStartAction
  | NodeDragMoveAction
  | NodeDragEndAction
  | BackgroundClickAction
  | BackgroundDoubleClickAction
  | RectSelectStartAction
  | RectSelectMoveAction
  | RectSelectEndAction
  | PasteAction
  | HoverAction
  | KeyAction;
```

### 4.2 パン・ズーム系

```typescript
/**
 * キャンバスのパン操作。
 * 背景ドラッグまたは中ボタンドラッグで発行。
 */
interface PanAction {
  readonly type: "pan";
  readonly deltaScreenX: number;
  readonly deltaScreenY: number;
}

/**
 * パン操作の終了。
 */
interface PanEndAction {
  readonly type: "pan_end";
}

/**
 * ズーム操作。
 * ホイールまたはピンチジェスチャで発行。
 */
interface ZoomAction {
  readonly type: "zoom";
  readonly focusScreen: ScreenPoint;
  readonly delta: number;
}
```

### 4.3 Node操作系

```typescript
/**
 * Nodeの単クリック。
 */
interface NodeClickAction {
  readonly type: "node_click";
  readonly nodeId: NodeId;
  readonly worldPoint: WorldPoint;
  readonly shiftKey: boolean;
}

/**
 * Nodeのダブルクリック。
 * → 編集モード開始のトリガー。
 */
interface NodeDoubleClickAction {
  readonly type: "node_double_click";
  readonly nodeId: NodeId;
  readonly worldPoint: WorldPoint;
}

/**
 * Nodeドラッグの開始。
 */
interface NodeDragStartAction {
  readonly type: "node_drag_start";
  readonly nodeId: NodeId;
  readonly worldPoint: WorldPoint;
}

/**
 * Nodeドラッグの途中移動。
 */
interface NodeDragMoveAction {
  readonly type: "node_drag_move";
  readonly nodeId: NodeId;
  readonly worldPoint: WorldPoint;
  readonly deltaWorldX: number;
  readonly deltaWorldY: number;
}

/**
 * Nodeドラッグの終了。
 */
interface NodeDragEndAction {
  readonly type: "node_drag_end";
  readonly nodeId: NodeId;
  readonly worldPoint: WorldPoint;
  readonly totalDeltaWorldX: number;
  readonly totalDeltaWorldY: number;
}
```

### 4.4 背景操作系

```typescript
/**
 * 背景の単クリック。
 * → 選択解除のトリガー。
 */
interface BackgroundClickAction {
  readonly type: "background_click";
  readonly worldPoint: WorldPoint;
}

/**
 * 背景のダブルクリック。
 * → 新規Node作成のトリガー。
 */
interface BackgroundDoubleClickAction {
  readonly type: "background_double_click";
  readonly worldPoint: WorldPoint;
}
```

### 4.5 矩形選択系

```typescript
/**
 * 矩形選択の開始。
 */
interface RectSelectStartAction {
  readonly type: "rect_select_start";
  readonly worldPoint: WorldPoint;
}

/**
 * 矩形選択の範囲更新。
 */
interface RectSelectMoveAction {
  readonly type: "rect_select_move";
  readonly worldPoint: WorldPoint;
  readonly selectionRect: WorldRect;
}

/**
 * 矩形選択の確定。
 */
interface RectSelectEndAction {
  readonly type: "rect_select_end";
  readonly selectionRect: WorldRect;
  readonly selectedNodeIds: readonly NodeId[];
}
```

### 4.6 ペースト・キー・ホバー

```typescript
/**
 * クリップボードからのペースト。
 * 画像またはテキスト。
 */
interface PasteAction {
  readonly type: "paste";
  readonly worldPoint: WorldPoint;
  readonly content: PasteContent;
}

type PasteContent =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "image"; readonly blob: Blob; readonly mime: string };

/**
 * ポインタのホバー状態変化。
 */
interface HoverAction {
  readonly type: "hover";
  readonly target: HitTarget;
  readonly worldPoint: WorldPoint;
}

/**
 * キーボード操作。
 * ショートカットキー等。
 */
interface KeyAction {
  readonly type: "key";
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
}
```

### 4.7 DragState

```typescript
/**
 * ドラッグ操作の状態マシン。
 */
type DragState =
  | IdleState
  | PanningState
  | DraggingNodeState
  | RectSelectingState;

interface IdleState {
  readonly type: "idle";
}

interface PanningState {
  readonly type: "panning";
  readonly startScreen: ScreenPoint;
  readonly lastScreen: ScreenPoint;
}

interface DraggingNodeState {
  readonly type: "dragging_node";
  readonly nodeId: NodeId;
  readonly startWorld: WorldPoint;
  readonly lastWorld: WorldPoint;
}

interface RectSelectingState {
  readonly type: "rect_selecting";
  readonly startWorld: WorldPoint;
  readonly currentWorld: WorldPoint;
}
```

### 4.8 InputConfig

```typescript
/**
 * 入力処理の設定。
 */
interface InputConfig {
  /** ドラッグ開始と判定するピクセル閾値 */
  readonly dragThreshold: number;

  /** ダブルクリックの最大間隔（ミリ秒） */
  readonly doubleClickInterval: number;

  /** ホイールズームの感度 */
  readonly wheelZoomSensitivity: number;

  /** タッチピンチズームの感度 */
  readonly pinchZoomSensitivity: number;
}
```

---

## 5. 公開インターフェース

### 5.1 InputHandler

```typescript
/**
 * DOM入力イベントを処理し、InputActionに変換するハンドラー。
 */
interface InputHandler {
  /**
   * Canvas要素にイベントリスナーをアタッチする。
   */
  attach(canvas: HTMLCanvasElement): void;

  /**
   * イベントリスナーを解除する。
   */
  detach(): void;

  /**
   * InputAction発行時のコールバックを登録する。
   */
  onAction(callback: (action: InputAction) => void): void;

  /**
   * 現在のDragStateを取得する。
   */
  getDragState(): DragState;

  /**
   * 現在有効なAffordanceリストを設定する。
   * 無効なAffordanceに対応するActionは発行されない。
   */
  setAffordances(affordances: readonly Affordance[]): void;

  /**
   * InputConfigを更新する。
   */
  setConfig(config: Partial<InputConfig>): void;
}
```

### 5.2 InputHandler 生成

```typescript
/**
 * InputHandlerを生成する。
 *
 * viewport: 座標変換に使用
 * hitTester: ヒットテストに使用
 */
function createInputHandler(params: {
  viewport: ViewportState;
  hitTester: HitTester;
  affordances?: readonly Affordance[];
  config?: Partial<InputConfig>;
}): InputHandler;
```

### 5.3 定数

```typescript
/**
 * デフォルトのInputConfig。
 */
const DEFAULT_INPUT_CONFIG: InputConfig;
// {
//   dragThreshold: 4,
//   doubleClickInterval: 300,
//   wheelZoomSensitivity: 0.001,
//   pinchZoomSensitivity: 0.01
// }
```

---

## 6. ファイル構成（想定）

```
canvas/input/
├── COMPONENT.md       # 本ドキュメント
├── types.ts           # InputAction, DragState, InputConfig, PasteContent 等
├── input-handler.ts   # InputHandler実装
├── drag-machine.ts    # DragStateのステートマシン実装
├── paste.ts           # クリップボードペースト処理
└── index.ts           # 公開APIの再エクスポート
```

---

## 7. 依存関係

```
canvas/input/ → canvas/viewport/   (ViewportState, WorldPoint, ScreenPoint, 座標変換関数)
canvas/input/ → canvas/hit-test/   (HitTester, HitTarget)
canvas/input/ → model/node/        (NodeId)
canvas/input/ → model/view/        (Affordance)
```

input/ はviewport/ の座標変換とhit-test/ のNode特定を組み合わせて
DOM入力をInputActionに変換する。

---

## 8. 不変条件

1. **AffordanceリストにないActionは発行しない**
2. **DragStateは常にいずれかの状態にある**（idle / panning / dragging / selecting）
3. **DragStart → DragMove* → DragEnd の順序が保証される**
4. **PasteActionはpaste_imageまたはcreate_node Affordanceが有効な場合のみ発行**
5. **座標変換はviewport/ に委譲し、input/内で独自計算しない**

---

## 9. 入力解釈のフローチャート

```
mousedown
  ├─ hitTest(point)
  │   ├─ Node にヒット
  │   │   ├─ drag_node Affordance あり → DraggingNode状態へ
  │   │   └─ select_node のみ → NodeClick候補（mouseupで確定）
  │   └─ 背景にヒット
  │       ├─ 左ボタン → Panning状態へ
  │       └─ 左ボタン + Shift → RectSelecting状態へ
  │
mousemove (DragState=panning)
  └─ PanAction を発行
  │
mousemove (DragState=dragging_node)
  └─ NodeDragMoveAction を発行
  │
mousemove (DragState=rect_selecting)
  └─ RectSelectMoveAction を発行
  │
mouseup
  ├─ DragState=panning → PanEndAction
  ├─ DragState=dragging_node → NodeDragEndAction
  ├─ DragState=rect_selecting → RectSelectEndAction
  └─ DragState=idle (移動量 < threshold)
      ├─ Node上 → NodeClickAction
      └─ 背景上 → BackgroundClickAction
  │
dblclick
  ├─ Node上 → NodeDoubleClickAction
  └─ 背景上 → BackgroundDoubleClickAction
  │
wheel
  └─ ZoomAction
  │
paste
  └─ PasteAction (Affordanceチェック後)
```
