# MVP 実装順序

## 依存グラフ

```
Phase 1 (基底・依存なし)
  model/node         ← 全コンポーネントの型基盤
  canvas/viewport    ← 純粋数学、canvas層の型基盤
  storage/db         ← IndexedDBラッパー、storage層の基盤

Phase 2 (model層)
  model/meta         ← node に依存
  model/projection   ← node に依存

Phase 3 (storage層)
  storage/event-store ← db, node, meta に依存

Phase 4 (canvas層)
  canvas/renderer    ← viewport, node, projection, meta に依存
  canvas/hit-test    ← viewport, node に依存
  canvas/input       ← viewport, hit-test, node に依存

Phase 5 (統合)
  app/src/main.ts    ← 全コンポーネントを接続
```

---

## Phase 1: 基底コンポーネント

### 1-1. model/node

**所要ファイル:** `factory.ts`, `payload.ts`, `epistemic.ts`

他の全コンポーネントが `NodeId`, `Node`, `Payload`, `Timestamp` 等を参照する。
最初に実装し、以降の開発で import できる状態にする。

**詳細:** [components/model-node.md](./components/model-node.md)

### 1-2. canvas/viewport

**所要ファイル:** `camera.ts`, `transform.ts`, `query.ts`, `canvas-size.ts`

純粋な数学関数のみ。DOM依存は `measureCanvasSize` / `applyCanvasSize` のみ。
テスト容易で他コンポーネントへの影響が大きい。

**詳細:** [components/canvas-viewport.md](./components/canvas-viewport.md)

### 1-3. storage/db

**所要ファイル:** `database.ts`, `transaction.ts`, `query-range.ts`, `schema.ts`

IndexedDB API のPromiseラッパー。
event-store が依存するため先に実装する。

**詳細:** [components/storage-db.md](./components/storage-db.md)

---

## Phase 2: モデル層

### 2-1. model/meta

**所要ファイル:** `dormancy.ts`（最小実装）

MVP では `DormancyState = "active"` 固定。
`initDormancy` と `dormancyDepth` 程度で十分。
Voice / Salience はスタブのまま残す。

**詳細:** [components/model-meta.md](./components/model-meta.md)

### 2-2. model/projection

**所要ファイル:** `factory.ts`, `output.ts`, `position.ts`

ManualTransform のみ実装。
`Position` の CRUD と `createManualProjection` がMVPの核。

**詳細:** [components/model-projection.md](./components/model-projection.md)

---

## Phase 3: ストレージ層

### 3-1. storage/event-store

**所要ファイル:** `event-store.ts`（Node CRUD のみ）

MVP では ThoughtEvent の追記は行わない。
`saveNode` / `getAllNodes` / `getNode` でスナップショットを直接永続化する。

**詳細:** [components/storage-event-store.md](./components/storage-event-store.md)

---

## Phase 4: キャンバス層

### 4-1. canvas/renderer

**所要ファイル:** `renderer.ts`, `draw-node.ts`, `draw-background.ts`, `theme.ts`, `scene-builder.ts`

Node を矩形＋テキストとして描画する。
背景はドットグリッド。Edge / Annotation 描画はスキップ。

**詳細:** [components/canvas-renderer.md](./components/canvas-renderer.md)

### 4-2. canvas/hit-test

**所要ファイル:** `hit-tester.ts`, `rect-utils.ts`, `bounds.ts`, `scene-builder.ts`

ポイントヒットテスト（クリック位置 → NodeId 特定）のみ実装。
矩形選択はスキップ。

**詳細:** [components/canvas-hit-test.md](./components/canvas-hit-test.md)

### 4-3. canvas/input

**所要ファイル:** `input-handler.ts`, `drag-machine.ts`

マウスイベントのみ処理。
ドラッグ状態マシン（idle / panning / dragging_node）を実装。
タッチ / キーボード / ペーストはスキップ。

**詳細:** [components/canvas-input.md](./components/canvas-input.md)

---

## Phase 5: アプリ統合

### 5-1. app/src/main.ts

全コンポーネントを接続し、InputAction → 状態更新 → 再描画のループを構築する。
テキスト編集は HTML `<input>` または `<textarea>` のオーバーレイで実現する。

**詳細:** [integration/app-entry.md](./integration/app-entry.md)

---

## 並列実装の可能性

Phase 1 の3コンポーネント（node, viewport, db）は**完全に独立**しており、並列に実装可能。

Phase 2 の2コンポーネント（meta, projection）も node 完成後に並列実装可能。

Phase 4 の3コンポーネント（renderer, hit-test, input）は viewport に依存するが、
renderer と hit-test は互いに独立しているため並列実装可能。
input は hit-test に依存するため最後。

```
並列実装タイムライン:

T1: [node] [viewport] [db]          ← 3並列
T2: [meta] [projection]             ← 2並列
T3: [event-store]
T4: [renderer] [hit-test]           ← 2並列
T5: [input]
T6: [main.ts 統合]
```
