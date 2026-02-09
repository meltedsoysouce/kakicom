# アプリ統合 (main.ts) MVP実装仕様

## 概要

全コンポーネントを接続し、以下のメインループを構築する:

```
InputAction → 状態更新 → RenderScene構築 → 再描画
```

加えて、テキスト編集用のHTML要素オーバーレイを管理する。

## 作成・変更ファイル

```
app/src/
├── main.ts           # エントリーポイント（既存ファイルを書き換え）
├── app.ts            # アプリケーションロジック（新規）
├── text-editor.ts    # テキスト編集オーバーレイ（新規）
├── style.css         # キャンバスのスタイル（既存ファイルを書き換え）
└── index.html        # ← app/ 直下の既存HTMLを調整（canvas要素追加）
```

## アーキテクチャ

```
┌──────────────────────────────────────────────────┐
│  main.ts  (起動・初期化)                          │
│    ├─ IndexedDB接続 (createEventStore)            │
│    ├─ Nodeロード (getAllNodes)                     │
│    ├─ Canvas要素取得                               │
│    └─ App生成 → app.start()                       │
└──────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────┐
│  app.ts  (アプリケーション状態管理)                │
│                                                    │
│  AppState:                                         │
│    camera: Camera                                  │
│    canvasSize: CanvasSize                          │
│    nodes: Map<NodeId, NodeSnapshot>                │
│    positions: Map<NodeId, Position>                │
│    selectedNodeId: NodeId | null                   │
│    projection: Projection                          │
│                                                    │
│  入力: InputAction → handleAction()               │
│  出力: RenderScene → renderer.setScene()          │
│                                                    │
│  コンポーネント保持:                                │
│    renderer: Renderer                              │
│    hitTester: HitTester                            │
│    inputHandler: InputHandler                      │
│    eventStore: EventStore                          │
│    textEditor: TextEditor                          │
└──────────────────────────────────────────────────┘
```

## main.ts の実装

```typescript
import { createEventStore } from "./storage/event-store/index.ts";
import { createApp } from "./app.ts";

async function main() {
  // 1. DOM取得
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const container = document.getElementById("app") as HTMLDivElement;

  // 2. ストレージ初期化
  const eventStore = await createEventStore();

  // 3. 既存Node読み込み
  const snapshots = await eventStore.getAllNodes();

  // 4. アプリ生成・起動
  const app = createApp({ canvas, container, eventStore, initialSnapshots: snapshots });
  app.start();

  // 5. リサイズ対応
  window.addEventListener("resize", () => app.resize());
}

main().catch(console.error);
```

## app.ts の実装

### 状態管理

```typescript
interface AppState {
  camera: Camera;
  canvasSize: CanvasSize;
  nodes: Map<NodeId, NodeSnapshot>;
  positions: Map<NodeId, Position>;
  selectedNodeId: NodeId | null;
}
```

### InputAction ハンドリング

```typescript
function handleAction(action: InputAction): void {
  switch (action.type) {
    case "pan":
      state.camera = panByScreenDelta(state.camera, action.deltaScreenX, action.deltaScreenY);
      updateViewport();
      break;

    case "pan_end":
      // 何もしない
      break;

    case "zoom":
      state.camera = zoomByWheel(
        state.camera,
        state.canvasSize,
        action.focusScreen,
        action.delta,
      );
      updateViewport();
      break;

    case "background_double_click":
      createNewNode(action.worldPoint);
      break;

    case "background_click":
      state.selectedNodeId = null;
      rebuildScene();
      break;

    case "node_click":
      state.selectedNodeId = action.nodeId;
      rebuildScene();
      break;

    case "node_double_click":
      // テキスト編集モード開始
      textEditor.open(action.nodeId, action.worldPoint);
      break;

    case "node_drag_start":
      state.selectedNodeId = action.nodeId;
      break;

    case "node_drag_move":
      moveNode(action.nodeId, action.deltaWorldX, action.deltaWorldY);
      break;

    case "node_drag_end":
      saveNodePosition(action.nodeId);
      break;
  }
}
```

### Node作成フロー

```typescript
async function createNewNode(worldPoint: WorldPoint): Promise<void> {
  // 1. Node生成（空テキスト）
  const node = createNode({ payload: { type: "text", text: "" } });

  // 2. Position設定
  const position: Position = { x: worldPoint.wx, y: worldPoint.wy };
  state.positions.set(node.id, position);

  // 3. NodeSnapshot生成
  const snapshot: NodeSnapshot = {
    node,
    dormancyState: "active",
    updatedAt: now(),
  };
  state.nodes.set(node.id, snapshot);

  // 4. IndexedDB保存
  await eventStore.saveNode(snapshot);

  // 5. 再描画
  rebuildScene();

  // 6. 即座にテキスト編集モードへ
  textEditor.open(node.id, worldPoint);
}
```

### Node移動フロー

```typescript
function moveNode(nodeId: NodeId, dx: number, dy: number): void {
  const pos = state.positions.get(nodeId);
  if (!pos) return;
  state.positions.set(nodeId, { x: pos.x + dx, y: pos.y + dy });
  rebuildScene();
}

async function saveNodePosition(nodeId: NodeId): Promise<void> {
  // 位置はProjectionOutputに保存するが、
  // MVPではNodeSnapshotと一緒にIndexedDBに保存する簡易方式を取る。
  // → NodeSnapshot に positions Map を埋め込む or 別ストアに保存
  // ※ 後述の「位置の永続化」セクション参照
}
```

### RenderScene 構築

```typescript
function rebuildScene(): void {
  const renderableNodes: RenderableNode[] = [];

  for (const [nodeId, snapshot] of state.nodes) {
    const position = state.positions.get(nodeId);
    if (!position) continue;

    renderableNodes.push(
      toRenderableNode({
        node: snapshot.node,
        position: { wx: position.x, wy: position.y },
        dormancyState: snapshot.dormancyState,
        selected: nodeId === state.selectedNodeId,
        hovered: false,
      }),
    );
  }

  const scene: RenderScene = {
    nodes: renderableNodes,
    edges: [],
    annotations: [],
    background: "dot_grid",
  };

  renderer.setScene(scene);
  renderer.requestRedraw();

  // HitTestableScene も更新
  hitTester.setScene(buildHitTestableScene(renderableNodes));
}
```

## text-editor.ts の実装

Canvas上のNodeをダブルクリックしたとき、HTML `<textarea>` をオーバーレイ表示する。

```typescript
interface TextEditor {
  open(nodeId: NodeId, worldPoint: WorldPoint): void;
  close(): void;
  isOpen(): boolean;
}

function createTextEditor(params: {
  container: HTMLElement;
  getViewport: () => ViewportState;
  onCommit: (nodeId: NodeId, text: string) => void;
}): TextEditor {
  let textarea: HTMLTextAreaElement | null = null;
  let editingNodeId: NodeId | null = null;

  return {
    open(nodeId, worldPoint) {
      // 既存の編集をコミット
      if (textarea) close();

      editingNodeId = nodeId;

      // textarea 生成
      textarea = document.createElement("textarea");
      textarea.className = "node-text-editor";

      // ワールド座標 → スクリーン座標でポジショニング
      const viewport = params.getViewport();
      const screen = worldToScreen(viewport, worldPoint);
      textarea.style.left = `${screen.sx - 60}px`;
      textarea.style.top = `${screen.sy - 24}px`;
      textarea.style.width = "200px";
      textarea.style.minHeight = "48px";

      // 既存テキストを設定
      // (nodeId から現在のテキストを取得する仕組みが必要)

      params.container.appendChild(textarea);
      textarea.focus();

      // Enterで確定（Shift+Enterで改行）、Escapeでキャンセル
      textarea.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          commit();
        }
        if (e.key === "Escape") {
          close();
        }
      });

      // フォーカス喪失で確定
      textarea.addEventListener("blur", () => commit());
    },

    close() {
      if (textarea) {
        textarea.remove();
        textarea = null;
        editingNodeId = null;
      }
    },

    isOpen() {
      return textarea !== null;
    },
  };

  function commit() {
    if (!textarea || !editingNodeId) return;
    params.onCommit(editingNodeId, textarea.value);
    // close は onCommit 後に呼ばれる
    textarea?.remove();
    textarea = null;
    editingNodeId = null;
  }
}
```

## 位置の永続化

MVPでは Node の位置（Position）を永続化する必要がある。
設計上 Position は `model/projection/` の概念で、Node自体には含まれない。

### 方式: NodeSnapshot を拡張せず、別途保存する

IndexedDB に positions を保存するには2つの方法がある:

**方法A: NodeSnapshot にメタデータとして埋め込む（MVP推奨）**

```typescript
// NodeSnapshot と一緒に position を保存
// → event-store の nodes ストアに position フィールドを追加

interface PersistedNode {
  snapshot: NodeSnapshot;
  position: Position;
}
// keyPath: "snapshot.node.id"
```

この方法は `types.ts` を変更せず、storage層の内部実装で対応できる。

**方法B: 別の ObjectStore に保存**

`positions` ストアを追加し、`{ nodeId, position }` を保存する。
→ スキーマ変更が必要なので MVP では避ける。

**推奨:** 方法A。`saveNode` 時に position も一緒に保存し、
`getAllNodes` 時に position も一緒に返す。event-store の内部実装で吸収する。

## style.css

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #1a1a2e;
}

#canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.node-text-editor {
  position: absolute;
  background: #16213e;
  color: #e0e0e0;
  border: 2px solid #53c2f0;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  font-family: system-ui, sans-serif;
  resize: both;
  outline: none;
  z-index: 100;
}
```

## index.html の調整

```html
<div id="app">
  <canvas id="canvas"></canvas>
</div>
<script type="module" src="/src/main.ts"></script>
```

## 起動シーケンス

```
1. main.ts: DOM Ready
2. createEventStore() → IndexedDB 接続
3. getAllNodes() → 保存済みNode読み込み
4. createApp() → 各コンポーネント初期化:
   a. measureCanvasSize(canvas)
   b. createRenderer() → init(canvas) → start()
   c. createHitTester()
   d. createInputHandler({ viewport, hitTester })
   e. inputHandler.attach(canvas)
   f. inputHandler.onAction(handleAction)
   g. createTextEditor(...)
5. 読み込んだNodeからRenderScene構築 → 初回描画
6. リサイズ監視開始
```

## テスト基準

- ブラウザでページを開くとドットグリッド背景が表示される
- 背景ダブルクリックでNodeが作成され、テキスト入力状態になる
- テキスト入力後Enterで確定、Nodeにテキストが表示される
- Nodeをドラッグで移動できる
- 背景ドラッグでパンできる
- ホイールでズームできる
- リロード後もNodeが残っている
- 複数Nodeを作成・配置・編集できる
