# canvas/hit-test/ — ヒットテストコンポーネント

## 1. 概要

本コンポーネントは**空間クエリ**を担当する。
スクリーン座標上のポインタ位置やドラッグ範囲に対して
「どのNodeが対象か」を判定する。

ユーザーのクリック・ドラッグ操作をNodeへの操作に変換するための
中間レイヤーであり、input/ が受け取ったDOM座標を
hit-test/ 経由でNodeIdに解決する。

---

## 2. 責務

- ポイントヒットテスト（1点 → Node特定）
- 矩形選択テスト（矩形 → Node集合）
- 最前面判定（重なったNodeのz-order解決）
- Nodeのバウンディングボックス管理
- Edge上のポイントヒットテスト（将来）

### 責務に含まれないもの

- 座標変換そのもの（→ viewport/）
- 描画（→ renderer/）
- 入力イベントの受付（→ input/）
- Nodeの位置計算（→ model/projection/ + 上位層）

---

## 3. 設計原則

1. **ワールド座標で判定する** — 入力座標はviewport/で事前変換
2. **MVP段階は線形走査** — Node数が少ないため最適化不要
3. **Nodeの形状は矩形前提** — 円形・多角形は将来の拡張
4. **z-orderは配列順序で表現** — 後ろの要素ほど前面

---

## 4. 公開データ構造

### 4.1 HitTarget

```typescript
/**
 * ヒットテストの結果。
 * ポインタ位置にNodeがあればnodeIdを返し、なければnull。
 */
interface HitTarget {
  readonly type: "node";
  readonly nodeId: NodeId;
} | {
  readonly type: "edge";
  readonly sourceNodeId: NodeId;
  readonly targetNodeId: NodeId;
} | {
  readonly type: "background";
}
```

### 4.2 HitTestEntry

```typescript
/**
 * ヒットテスト対象のNode情報。
 * Nodeのワールド座標上のバウンディングボックスを保持する。
 *
 * HitTestableScene に登録し、ヒットテストの入力とする。
 */
interface HitTestEntry {
  readonly nodeId: NodeId;
  readonly bounds: WorldRect;
  readonly zIndex: number;
}
```

### 4.3 HitTestableScene

```typescript
/**
 * ヒットテスト可能なシーン全体。
 * 現在画面上に存在する全Nodeのバウンディングボックスを保持する。
 *
 * renderer/ の RenderScene と並行して更新される。
 */
interface HitTestableScene {
  readonly entries: readonly HitTestEntry[];
}
```

### 4.4 SelectionRect

```typescript
/**
 * 矩形選択の範囲。
 * ドラッグ開始点と現在点から算出される。
 */
interface SelectionRect {
  readonly start: WorldPoint;
  readonly end: WorldPoint;
  readonly rect: WorldRect;
}
```

### 4.5 HitTestOptions

```typescript
/**
 * ヒットテストのオプション。
 */
interface HitTestOptions {
  /** ポイントヒットの許容マージン（ワールド座標単位）。
   *  ノード境界から margin 以内でもヒットとみなす。 */
  readonly margin: number;

  /** DormancyState.Dormant のNodeをヒット対象にするか */
  readonly includeDormant: boolean;

  /** DormancyState.Archived のNodeをヒット対象にするか */
  readonly includeArchived: boolean;
}
```

---

## 5. 公開インターフェース

### 5.1 HitTester

```typescript
/**
 * ヒットテストを実行するオブジェクト。
 * シーンが更新されるたびに setScene() で最新データを反映する。
 */
interface HitTester {
  /**
   * ヒットテスト対象のシーンを設定する。
   */
  setScene(scene: HitTestableScene): void;

  /**
   * ワールド座標上の1点に対してヒットテストを実行する。
   * 最前面（zIndexが最大）のNodeを返す。
   * ヒットしなければ { type: "background" } を返す。
   */
  hitTestPoint(
    point: WorldPoint,
    options?: Partial<HitTestOptions>
  ): HitTarget;

  /**
   * ワールド座標上の矩形に含まれるNode一覧を返す。
   * 完全包含 or 交差のどちらかを選べる。
   */
  hitTestRect(
    rect: WorldRect,
    mode: "contains" | "intersects",
    options?: Partial<HitTestOptions>
  ): readonly NodeId[];

  /**
   * 指定NodeIdのバウンディングボックスを取得する。
   * 存在しない場合はnull。
   */
  getBounds(nodeId: NodeId): WorldRect | null;

  /**
   * ビューポート内に見えている全NodeIdを返す。
   */
  getVisibleNodes(viewportRect: WorldRect): readonly NodeId[];
}
```

### 5.2 HitTester 生成

```typescript
/**
 * HitTesterを生成する。
 */
function createHitTester(
  options?: Partial<HitTestOptions>
): HitTester;
```

### 5.3 HitTestableScene 構築

```typescript
/**
 * RenderableNode配列からHitTestableSceneを構築する。
 */
function buildHitTestableScene(
  nodes: readonly RenderableNode[]
): HitTestableScene;
```

### 5.4 SelectionRect 操作

```typescript
/**
 * ドラッグ開始点と現在点からSelectionRectを生成する。
 * 2点のmin/maxからWorldRectを算出する。
 */
function createSelectionRect(
  start: WorldPoint,
  current: WorldPoint
): SelectionRect;
```

### 5.5 バウンディングボックス算出

```typescript
/**
 * Node のPayloadとスタイルからバウンディングボックスのサイズを算出する。
 *
 * テキストの場合: テキスト幅 + パディング
 * 画像の場合: 画像サイズ（上限あり）
 * 混合の場合: 画像サイズ + メモ領域
 */
function computeNodeBounds(
  node: Node,
  position: WorldPoint,
  style: NodeStyle
): WorldRect;

/**
 * テキストの描画幅を推定する。
 * Canvas 2D の measureText に依存しない近似値。
 * （正確な値が必要な場合は renderer/ 経由でmeasureTextを呼ぶ）
 */
function estimateTextWidth(
  text: string,
  fontSize: number
): number;
```

### 5.6 矩形ユーティリティ

```typescript
/**
 * 点が矩形内に含まれるかを判定する。
 */
function rectContainsPoint(
  rect: WorldRect,
  point: WorldPoint
): boolean;

/**
 * 矩形Aが矩形Bを完全に包含するかを判定する。
 */
function rectContainsRect(
  outer: WorldRect,
  inner: WorldRect
): boolean;

/**
 * 二つの矩形が交差するかを判定する。
 */
function rectIntersects(
  a: WorldRect,
  b: WorldRect
): boolean;

/**
 * マージンを考慮して矩形を拡張する。
 */
function expandRect(
  rect: WorldRect,
  margin: number
): WorldRect;
```

---

## 6. ファイル構成（想定）

```
canvas/hit-test/
├── COMPONENT.md       # 本ドキュメント
├── types.ts           # HitTarget, HitTestEntry, HitTestableScene, SelectionRect, HitTestOptions
├── hit-tester.ts      # HitTester実装、createHitTester
├── bounds.ts          # computeNodeBounds, estimateTextWidth
├── rect-utils.ts      # rectContainsPoint, rectIntersects, expandRect 等
├── scene-builder.ts   # buildHitTestableScene
└── index.ts           # 公開APIの再エクスポート
```

---

## 7. 依存関係

```
canvas/hit-test/ → canvas/viewport/    (WorldPoint, WorldRect, ScreenPoint)
canvas/hit-test/ → canvas/renderer/    (RenderableNode, NodeStyle)
canvas/hit-test/ → model/node/         (Node, NodeId, Payload)
canvas/hit-test/ → model/meta/         (DormancyState)
```

hit-test/ はviewport/の座標型に依存し、
renderer/ のRenderableNode型を入力として受け取る。

---

## 8. 不変条件

1. **hitTestPoint は常にHitTargetを返す**（Nodeがなければbackground）
2. **zIndex が大きいNodeが優先される**（前面のNodeが先にヒット）
3. **HitTestOptions.margin ≥ 0**
4. **SelectionRect.rect はstartとendから一意に決まる**
5. **computeNodeBounds の結果は同一入力に対して決定的**

---

## 9. 将来の拡張

### 空間インデックス

MVP段階では全Nodeの線形走査で十分だが、
Node数が数百を超えた場合は空間インデックスの導入を検討する。

```
候補:
- 四分木（Quadtree）: 静的なNodeに適する
- R木（R-tree）: 矩形クエリに最適
- グリッドハッシュ: 実装が簡単で十分な性能
```

HitTester インターフェースは変えず、
内部実装を差し替えることで対応する。

### Edge ヒットテスト

MVP段階ではEdgeのクリック検出は不要だが、
将来Edgeの選択・削除操作を追加する際に
線分に対するポイントヒットテストを実装する。
