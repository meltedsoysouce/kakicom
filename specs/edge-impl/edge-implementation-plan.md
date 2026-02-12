# Edge（Node間接続）導入 実装計画

## Context

現状のkakicomはNodeの空間配置のみをサポートしている。Node間の関係性を可視化するために、N:M接続を実現するEdge（線分ツール）を導入する。

既存コードには以下の**準備済み要素**がある:
- `model/projection/types.ts` に Projection出力用の `Edge` 型（IDなし、weight付き）
- `model/event/types.ts` に `LinkedDetail` / `UnlinkedDetail` イベント型
- `canvas/renderer/types.ts` に `RenderableEdge` 型（位置ベース、選択状態なし）
- `canvas/hit-test/types.ts` に `HitTarget` の `"edge"` バリアント
- `canvas/renderer/theme.ts` に `EdgeStyle`（色・線幅・矢印サイズ定義済み）

**設計判断**:
- Projection の `Edge` は導出的な概念（読み取り専用の写像出力）なので、別途永続化可能なドメイン `Edge` を `model/edge/` に新設する
- Edgeは有向（source→target）、描画は控えめな矢印付き直線
- 操作: `L`キーでリンクモード切替 → ソースNode選択 → ターゲットNode選択 → Edge作成
- デフォルト relation: `"associated"`

---

## Phase 1: Model — Edge ドメイン型定義

**目的**: `model/edge/` モジュールを新設し、永続化可能なEdgeのドメイン型とファクトリ関数を定義する。

**作成ファイル**:
- `app/src/model/edge/types.ts`
- `app/src/model/edge/factory.ts`
- `app/src/model/edge/index.ts`

### 型定義 (`types.ts`)

```typescript
import type { NodeId, Timestamp } from "../node/index.ts";
import type { EdgeRelation } from "../projection/index.ts";

export type EdgeId = string & { readonly __brand: "EdgeId" };

export interface Edge {
  readonly id: EdgeId;
  readonly sourceNodeId: NodeId;
  readonly targetNodeId: NodeId;
  readonly relation: EdgeRelation;
  readonly label: string | null;
  readonly createdAt: Timestamp;
}
```

### ファクトリ (`factory.ts`)

```typescript
generateEdgeId(): EdgeId        // crypto.randomUUID() + ブランドキャスト
createEdge(params): Edge        // sourceNodeId, targetNodeId, relation?, label? を受け取る
                                // relation デフォルト: "associated"
                                // label デフォルト: null
```

### 参照すべき既存パターン

| パターン | 参照ファイル |
|----------|-------------|
| ブランド型ID | `model/node/types.ts` L1-3 (`NodeId`, `Timestamp`) |
| ファクトリ関数 | `model/node/factory.ts` (`generateNodeId`, `createNode`) |
| EdgeRelation型 | `model/projection/types.ts` L107-114 |
| index.ts再エクスポート | `model/node/index.ts` |

### 注意事項
- `model/` は外部依存なし、ブラウザAPI参照禁止（`crypto.randomUUID()` は例外的に許容）
- 全フィールド `readonly`
- `import type` を使用（`verbatimModuleSyntax`）
- `.ts` 拡張子を import パスに明記

---

## Phase 2: Storage — Edge 永続化

**目的**: IndexedDB に `edges` ストアを追加し、Edge の CRUD を実装する。

**変更ファイル**:
- `app/src/storage/db/schema.ts` — DB version 2 マイグレーション追加
- `app/src/storage/event-store/types.ts` — `PersistedEdgeRecord` 型、`EventStore` インターフェース拡張
- `app/src/storage/event-store/event-store.ts` — Edge CRUD 実装
- `app/src/storage/event-store/index.ts` — 再エクスポート追加

### スキーマ変更 (`schema.ts`)

```typescript
// version を 2 に変更
// 新規マイグレーション追加:
{
  version: 2,
  migrate(db) {
    const edges = db.createObjectStore("edges", { keyPath: "id" });
    edges.createIndex("source_node_id", "sourceNodeId", { unique: false });
    edges.createIndex("target_node_id", "targetNodeId", { unique: false });
  },
}
```

`STORE_NAMES` に `EDGES: "edges"` を追加。

### 型追加 (`event-store/types.ts`)

```typescript
// Phase 1 の EdgeId, Edge をインポート
export interface PersistedEdgeRecord {
  readonly id: EdgeId;
  readonly sourceNodeId: NodeId;
  readonly targetNodeId: NodeId;
  readonly relation: EdgeRelation;
  readonly label: string | null;
  readonly createdAt: Timestamp;
}
```

### EventStore インターフェース拡張

```typescript
// 追加メソッド:
saveEdge(edge: Edge): Promise<void>;
getAllEdges(): Promise<readonly PersistedEdgeRecord[]>;
deleteEdge(edgeId: EdgeId): Promise<void>;
```

### 実装パターン

`saveNode` の実装パターン（`event-store.ts` L19-30）をそのまま踏襲:
```typescript
async saveEdge(edge: Edge): Promise<void> {
  const record: PersistedEdgeRecord = { ...edge };
  const tx = db.transaction([STORE_NAMES.EDGES], "readwrite");
  const store = tx.store<PersistedEdgeRecord>(STORE_NAMES.EDGES);
  await store.put(record);
  await tx.done();
}
```

### 参照すべき既存パターン

| パターン | 参照ファイル |
|----------|-------------|
| マイグレーション | `storage/db/schema.ts` L13-34 |
| STORE_NAMES | `storage/db/schema.ts` L3-8 |
| CRUD実装 | `storage/event-store/event-store.ts` L19-50 |
| トランザクション | `storage/db/types.ts` L82-114 |

### 注意事項
- DB version を 1 → 2 に上げる（`onupgradeneeded` で自動マイグレーション）
- Edge の keyPath は `"id"`（Node の `"node.id"` とは異なる点に注意）
- `PersistedEdgeRecord` は `Edge` と同一構造（今はラップ不要だが将来の拡張余地を残す）

---

## Phase 3: Canvas — Edge 描画

**目的**: Edge を Canvas 上に直線（矢印付き）として描画する。

**変更ファイル**:
- `app/src/canvas/renderer/types.ts` — `RenderableEdge` に `id`, `selected` を追加
- `app/src/canvas/renderer/draw-edge.ts` — **新規作成**
- `app/src/canvas/renderer/renderer.ts` — Edge 描画呼び出し追加
- `app/src/canvas/renderer/scene-builder.ts` — `toRenderableEdge` 追加
- `app/src/canvas/renderer/index.ts` — 再エクスポート追加

### RenderableEdge 拡張 (`types.ts`)

```typescript
export interface RenderableEdge {
  readonly id: EdgeId;                // 追加: 選択・ヒットテスト用
  readonly sourceNodeId: NodeId;      // 追加: ヒットテスト結果用
  readonly targetNodeId: NodeId;      // 追加: ヒットテスト結果用
  readonly sourcePosition: WorldPoint;
  readonly targetPosition: WorldPoint;
  readonly relation: EdgeRelation;
  readonly label: string | null;
  readonly selected: boolean;         // 追加
}
```

`weight` フィールドは削除（ドメインEdgeに不要、projectionのみで使用）。

### draw-edge.ts（新規作成）

```typescript
export function drawEdge(
  ctx: CanvasRenderingContext2D,
  edge: RenderableEdge,
  theme: RenderTheme,
): void
```

描画内容:
1. source → target への直線（`ctx.beginPath()`, `moveTo`, `lineTo`, `stroke`）
2. target 側に小さな矢印ヘッド（三角形、`theme.edgeDefaults.arrowSize`）
3. 選択時は `theme.selectionColor` でハイライト（線幅を太く）
4. ラベルがあれば線分中点にテキスト描画

参考: `draw-node.ts` の描画パターン（ctx操作、theme参照）

### renderer.ts 変更

`renderFrame()` 内、Node描画の**前**にEdge描画を挿入（Nodeが上に来るように）:

```typescript
// Edge描画（Nodeの下に描画）
for (const edge of scene.edges) {
  drawEdge(ctx, edge, theme);
}

// Node描画
for (const node of scene.nodes) {
  drawNode(ctx, node, theme);
}
```

`import { drawEdge } from "./draw-edge.ts";` を追加。

### scene-builder.ts 変更

```typescript
export function toRenderableEdge(params: {
  edge: Edge;                        // model/edge の Edge
  sourcePosition: WorldPoint;
  targetPosition: WorldPoint;
  selected: boolean;
}): RenderableEdge
```

### 参照すべき既存パターン

| パターン | 参照ファイル |
|----------|-------------|
| 描画関数 | `canvas/renderer/draw-node.ts` |
| テーマ参照 | `canvas/renderer/theme.ts` L89-95 (`edgeDefaults`) |
| RenderableEdge現状 | `canvas/renderer/types.ts` L128-134 |
| シーンビルダー | `canvas/renderer/scene-builder.ts` |
| レンダラー | `canvas/renderer/renderer.ts` L63-69 |

---

## Phase 4: Canvas — Edge ヒットテスト・入力アクション定義

**目的**: Edge のクリック検出と、リンクモード用の入力アクションを定義する。

**変更ファイル**:
- `app/src/canvas/hit-test/types.ts` — `HitTestableScene` に Edge エントリ追加
- `app/src/canvas/hit-test/hit-tester.ts` — Edge ヒットテスト実装
- `app/src/canvas/hit-test/scene-builder.ts` — Edge 用シーンビルド追加
- `app/src/canvas/hit-test/index.ts` — 再エクスポート
- `app/src/canvas/input/types.ts` — リンクモード用 InputAction 追加

### ヒットテスト

`HitTestableScene` に Edge 情報を追加:
```typescript
export interface HitTestEdgeEntry {
  readonly edgeId: EdgeId;
  readonly sourceNodeId: NodeId;
  readonly targetNodeId: NodeId;
  readonly sourcePosition: WorldPoint;
  readonly targetPosition: WorldPoint;
}

export interface HitTestableScene {
  readonly entries: readonly HitTestEntry[];
  readonly edges: readonly HitTestEdgeEntry[];  // 追加
}
```

`hitTestPoint` にEdgeヒットテストを追加:
- Node が優先（先にチェック）
- Node にヒットしなければ Edge をチェック
- 点から線分への距離が閾値（例: 8px をズームで割った値）以内ならヒット
- 距離計算: 点から線分への最短距離（純粋な幾何計算）

```typescript
// 点から線分への最短距離（rect-utils.ts に追加、または新規ユーティリティ）
function distanceToSegment(point: WorldPoint, a: WorldPoint, b: WorldPoint): number
```

### 新規 InputAction

```typescript
// リンクモード開始（ソースNode選択済み）
export interface LinkStartAction {
  readonly type: "link_start";
  readonly sourceNodeId: NodeId;
  readonly worldPoint: WorldPoint;
}

// リンクモード完了（ターゲットNode選択）
export interface LinkCompleteAction {
  readonly type: "link_complete";
  readonly sourceNodeId: NodeId;
  readonly targetNodeId: NodeId;
}

// リンクモード中のマウス移動（プレビュー線描画用）
export interface LinkPreviewAction {
  readonly type: "link_preview";
  readonly sourceNodeId: NodeId;
  readonly worldPoint: WorldPoint;
}

// リンクモードキャンセル
export interface LinkCancelAction {
  readonly type: "link_cancel";
}
```

`InputAction` union に4型を追加。

### 参照すべき既存パターン

| パターン | 参照ファイル |
|----------|-------------|
| HitTarget edge バリアント | `canvas/hit-test/types.ts` L10-14 |
| hitTestPoint 実装 | `canvas/hit-test/hit-tester.ts` |
| 矩形ユーティリティ | `canvas/hit-test/rect-utils.ts` |
| シーンビルド | `canvas/hit-test/scene-builder.ts` |
| InputAction パターン | `canvas/input/types.ts` L14-30 |
| HitTestableScene | `canvas/hit-test/types.ts` L28-33 |

### 注意事項
- `HitTarget` の `"edge"` バリアントは既に定義済み（`sourceNodeId`, `targetNodeId`）→ `edgeId` を追加する
- `buildHitTestableScene` を拡張して `RenderableEdge[]` も受け取るようにする
- Edge ヒットテストはNode ヒットテストの**後**（Nodeが優先）

---

## Phase 5: App 統合 — 全レイヤー結合

**目的**: model/storage/canvas の各レイヤーを app.ts で結合し、Edge の作成・表示・選択・削除を実現する。

**変更ファイル**:
- `app/src/app.ts` — AppState拡張、リンクモード、Edge操作、handleAction拡張
- `app/src/main.ts` — Edge 読み込み追加

### AppState 拡張

```typescript
interface AppState {
  camera: Camera;
  canvasSize: CanvasSize;
  nodes: Map<NodeId, NodeSnapshot>;
  positions: Map<NodeId, Position>;
  edges: Map<EdgeId, Edge>;              // 追加
  selectedNodeId: NodeId | null;
  selectedEdgeId: EdgeId | null;         // 追加
  linkMode: LinkModeState;               // 追加
}

type LinkModeState =
  | { type: "inactive" }
  | { type: "selecting_source" }
  | { type: "selecting_target"; sourceNodeId: NodeId };
```

### リンクモード操作フロー

1. `L`キー押下 → `linkMode` を `"selecting_source"` に切替
2. Node クリック → `sourceNodeId` を記録、`"selecting_target"` に遷移
3. 別のNode クリック → `createEdge()` + `eventStore.saveEdge()` + `rebuildScene()`
4. 同じNodeクリック or `Escape` → リンクモードキャンセル
5. Edge 作成後 → `linkMode` を `"inactive"` に戻す

### rebuildScene 変更

```typescript
function rebuildScene(): void {
  // ... 既存の RenderableNode 構築 ...

  const renderableEdges: RenderableEdge[] = [];
  for (const [edgeId, edge] of state.edges) {
    const srcPos = state.positions.get(edge.sourceNodeId);
    const tgtPos = state.positions.get(edge.targetNodeId);
    if (!srcPos || !tgtPos) continue;
    renderableEdges.push(toRenderableEdge({
      edge,
      sourcePosition: { wx: srcPos.x, wy: srcPos.y },
      targetPosition: { wx: tgtPos.x, wy: tgtPos.y },
      selected: edgeId === state.selectedEdgeId,
    }));
  }

  const scene: RenderScene = {
    nodes: renderableNodes,
    edges: renderableEdges,
    annotations: [],
    background: "dot_grid",
  };
  // ...
}
```

### handleAction 拡張

```typescript
case "key":
  if (action.key === "l" || action.key === "L") {
    toggleLinkMode();
  }
  if (action.key === "Escape") {
    cancelLinkMode();
  }
  if (action.key === "Delete" || action.key === "Backspace") {
    deleteSelectedEdge();
  }
  break;

case "node_click":
  if (state.linkMode.type === "selecting_source") {
    // ソース選択 → ターゲット選択待ちへ
  } else if (state.linkMode.type === "selecting_target") {
    // ターゲット選択 → Edge作成
  } else {
    // 通常のNode選択
  }
  break;
```

### main.ts 変更

```typescript
const initialEdges = await eventStore.getAllEdges();
const app = createApp({
  canvas, container, eventStore,
  initialRecords,
  initialEdges,       // 追加
});
```

### リンクモード視覚フィードバック

- リンクモード中はカーソルを `crosshair` に変更（CSS）
- ソースNode選択後、マウス移動でプレビュー線を描画
  - `rebuildScene` 内で、`linkMode.type === "selecting_target"` の場合に一時的な Edge を追加
  - または renderer に overlay 機能を追加（より簡潔）

### 参照すべき既存パターン

| パターン | 参照ファイル |
|----------|-------------|
| AppState構造 | `app.ts` L27-33 |
| handleAction | `app.ts` L193-249 |
| rebuildScene | `app.ts` L104-133 |
| Node CRUD | `app.ts` L137-189 |
| 初期化フロー | `main.ts` |

---

## フェーズ依存関係

```
Phase 1 (Model)
  ├──→ Phase 2 (Storage)  ──┐
  └──→ Phase 3 (Rendering) ─┤
         └──→ Phase 4 (Hit/Input) ──→ Phase 5 (App統合)
                                   ──┘
```

Phase 2 と Phase 3 は**並列実行可能**。Phase 4 は Phase 3 に依存。Phase 5 は全フェーズに依存。

## ビルド検証

各フェーズ完了後に `pnpm build`（`app/` ディレクトリ内）を実行し、型エラーがないことを確認する。
Phase 5 完了後に `pnpm dev` で開発サーバーを起動し、以下を手動確認:
- `L`キーでリンクモード切替
- Node → Node のEdge作成
- Edge の描画（矢印付き直線）
- Edge クリックで選択
- Delete キーで Edge 削除
- ページリロード後も Edge が保持される
