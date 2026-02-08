# canvas/renderer/ — 描画パイプラインコンポーネント

## 1. 概要

本コンポーネントはCanvas 2D APIを使った**描画パイプライン**を提供する。
model/ の型データとviewport/ の座標変換を受け取り、
画面上にNode・Edge・Annotation・背景を描画する。

canvas/内でCanvas 2D APIを直接呼び出す唯一のコンポーネントであり、
将来のWebGPU移行時にはこのコンポーネントのみを差し替える。

---

## 2. 責務

- Canvas 2Dコンテキストの取得と管理
- 高DPI対応（devicePixelRatio）
- 描画ループ（requestAnimationFrame）の制御
- 背景描画（グリッド等）
- Node描画（矩形 + Payload可視化 + EpistemicState視覚マッピング）
- Edge描画（関係線）
- Annotation描画（注釈バッジ）
- 選択状態・ホバー状態のオーバーレイ描画
- DormancyStateに基づく退色描画
- ダーティフラグ管理（再描画が必要かの判定）

### 責務に含まれないもの

- 座標変換の計算（→ viewport/）
- クリック位置のNode特定（→ hit-test/）
- DOM入力イベントの処理（→ input/）
- 描画データの算出（→ model/ + 上位層）

---

## 3. 設計原則

1. **即時モード描画** — 毎フレーム全描画をやり直す（retained modeではない）
2. **宣言的入力** — 「何を描くか」をRenderCommandとして受け取る
3. **Canvas 2D APIをこの中に閉じ込める** — 他コンポーネントがctxを直接触らない
4. **描画順序を明示する** — z-orderをレイヤーで管理する

---

## 4. 公開データ構造

### 4.1 RenderContext

```typescript
/**
 * 描画に必要な全コンテキストを統合したオブジェクト。
 * 毎フレームの描画関数に渡す。
 */
interface RenderContext {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly viewportState: ViewportState;
  readonly theme: RenderTheme;
}
```

### 4.2 RenderTheme

```typescript
/**
 * 描画のテーマ（色・フォント・線幅等）。
 * ダーク / ライトモードや将来のカスタマイズに対応する。
 */
interface RenderTheme {
  readonly background: string;
  readonly gridColor: string;
  readonly gridOpacity: number;

  readonly nodeDefaults: NodeStyle;
  readonly edgeDefaults: EdgeStyle;
  readonly annotationDefaults: AnnotationStyle;
  readonly selectionColor: string;
  readonly hoverColor: string;
}
```

### 4.3 NodeStyle

```typescript
/**
 * Nodeの描画スタイル。
 * EpistemicState / DormancyState に応じて動的に調整される。
 */
interface NodeStyle {
  readonly fillColor: string;
  readonly strokeColor: string;
  readonly strokeWidth: number;
  readonly cornerRadius: number;
  readonly fontSize: number;
  readonly fontFamily: string;
  readonly textColor: string;
  readonly padding: number;
  readonly minWidth: number;
  readonly minHeight: number;
}
```

### 4.4 EpistemicVisualMap

```typescript
/**
 * EpistemicState → 視覚的パラメータのマッピング。
 */
interface EpistemicVisualMap {
  readonly certain: EpistemicVisual;
  readonly likely: EpistemicVisual;
  readonly hypothesis: EpistemicVisual;
  readonly speculative: EpistemicVisual;
  readonly unsure: EpistemicVisual;
}

/**
 * EpistemicStateに対応する視覚的調整値。
 */
interface EpistemicVisual {
  readonly opacity: number;
  readonly strokeDash: readonly number[];
  readonly strokeWidthMultiplier: number;
}
```

### 4.5 DormancyVisualMap

```typescript
/**
 * DormancyState → 視覚的パラメータのマッピング。
 */
interface DormancyVisualMap {
  readonly active: DormancyVisual;
  readonly cooling: DormancyVisual;
  readonly dormant: DormancyVisual;
  readonly archived: DormancyVisual;
}

/**
 * DormancyStateに対応する視覚的調整値。
 */
interface DormancyVisual {
  readonly opacity: number;
  readonly scaleMultiplier: number;
  readonly visible: boolean;
}
```

### 4.6 EdgeStyle

```typescript
/**
 * Edgeの描画スタイル。
 */
interface EdgeStyle {
  readonly strokeColor: string;
  readonly strokeWidth: number;
  readonly arrowSize: number;
  readonly labelFontSize: number;
  readonly labelColor: string;
}
```

### 4.7 AnnotationStyle

```typescript
/**
 * Annotationの描画スタイル。
 */
interface AnnotationStyle {
  readonly badgeSize: number;
  readonly badgeColor: string;
  readonly fontSize: number;
  readonly fontColor: string;
}
```

### 4.8 RenderableNode

```typescript
/**
 * 描画に必要なNode情報を統合したデータ。
 * model/のNodeとProjectionOutputのPositionを結合したもの。
 *
 * Rendererへの入力として使用する。
 * Rendererが直接model/の各型を組み合わせる必要がないようにする。
 */
interface RenderableNode {
  readonly id: NodeId;
  readonly payload: Payload;
  readonly kind: NodeKind;
  readonly epistemicState: EpistemicState;
  readonly dormancyState: DormancyState;
  readonly position: WorldPoint;
  readonly size: { readonly width: number; readonly height: number };
  readonly selected: boolean;
  readonly hovered: boolean;
}
```

### 4.9 RenderableEdge

```typescript
/**
 * 描画に必要なEdge情報を統合したデータ。
 */
interface RenderableEdge {
  readonly sourcePosition: WorldPoint;
  readonly targetPosition: WorldPoint;
  readonly relation: EdgeRelation;
  readonly label: string | null;
  readonly weight: number;
}
```

### 4.10 RenderableAnnotation

```typescript
/**
 * 描画に必要なAnnotation情報を統合したデータ。
 */
interface RenderableAnnotation {
  readonly position: WorldPoint;
  readonly kind: AnnotationKind;
  readonly content: string;
}
```

### 4.11 RenderScene

```typescript
/**
 * 1フレーム分の描画シーン全体。
 * Rendererはこのデータを受け取って描画する。
 */
interface RenderScene {
  readonly nodes: readonly RenderableNode[];
  readonly edges: readonly RenderableEdge[];
  readonly annotations: readonly RenderableAnnotation[];
  readonly background: BackgroundStyle;
}
```

### 4.12 RenderStats

```typescript
/**
 * 描画パフォーマンス統計。
 * デバッグ・最適化判断に使用。
 */
interface RenderStats {
  readonly frameTimeMs: number;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly annotationCount: number;
  readonly visibleNodeCount: number;
}
```

---

## 5. 公開インターフェース

### 5.1 Renderer ライフサイクル

```typescript
/**
 * Rendererを作成し、Canvas要素にアタッチする。
 */
interface Renderer {
  /**
   * Canvas要素を初期化する（コンテキスト取得、高DPI対応）。
   */
  init(canvas: HTMLCanvasElement): void;

  /**
   * 描画ループを開始する。
   */
  start(): void;

  /**
   * 描画ループを停止する。
   */
  stop(): void;

  /**
   * 再描画をリクエストする（次フレームで描画）。
   */
  requestRedraw(): void;

  /**
   * Canvas要素のリサイズ時に呼び出す。
   */
  resize(size: CanvasSize): void;

  /**
   * 現在のRenderSceneを設定する。
   * 次の描画フレームでこのシーンが描画される。
   */
  setScene(scene: RenderScene): void;

  /**
   * 現在のViewportStateを設定する。
   */
  setViewport(state: ViewportState): void;

  /**
   * RenderThemeを設定する。
   */
  setTheme(theme: RenderTheme): void;

  /**
   * リソースを解放する。
   */
  dispose(): void;
}
```

### 5.2 Renderer 生成

```typescript
/**
 * Canvas 2D Rendererを生成する。
 */
function createRenderer(options?: {
  theme?: RenderTheme;
}): Renderer;
```

### 5.3 テーマ

```typescript
/**
 * ダークテーマ（デフォルト）。
 */
const DARK_THEME: RenderTheme;

/**
 * ライトテーマ。
 */
const LIGHT_THEME: RenderTheme;

/**
 * デフォルトのEpistemicVisualMapを返す。
 */
function defaultEpistemicVisuals(): EpistemicVisualMap;

/**
 * デフォルトのDormancyVisualMapを返す。
 */
function defaultDormancyVisuals(): DormancyVisualMap;
```

### 5.4 RenderScene 構築補助

```typescript
/**
 * model/ のデータからRenderableNodeを構築する。
 */
function toRenderableNode(params: {
  node: Node;
  position: WorldPoint;
  dormancyState: DormancyState;
  selected: boolean;
  hovered: boolean;
}): RenderableNode;

/**
 * 空のRenderSceneを生成する。
 */
function emptyScene(): RenderScene;
```

---

## 6. ファイル構成（想定）

```
canvas/renderer/
├── COMPONENT.md            # 本ドキュメント
├── types.ts                # RenderScene, RenderableNode, RenderTheme 等の型
├── renderer.ts             # Renderer実装（Canvas 2Dコンテキスト操作）
├── draw-node.ts            # Node描画ロジック
├── draw-edge.ts            # Edge描画ロジック
├── draw-annotation.ts      # Annotation描画ロジック
├── draw-background.ts      # 背景描画ロジック（グリッド等）
├── theme.ts                # DARK_THEME, LIGHT_THEME, visual maps
├── scene-builder.ts        # toRenderableNode, emptyScene
└── index.ts                # 公開APIの再エクスポート
```

---

## 7. 依存関係

```
canvas/renderer/ → canvas/viewport/  (ViewportState, WorldPoint, ScreenPoint, CanvasSize)
canvas/renderer/ → model/node/       (Node, Payload, NodeKind, EpistemicState)
canvas/renderer/ → model/projection/ (EdgeRelation, AnnotationKind, Position)
canvas/renderer/ → model/meta/       (DormancyState)
canvas/renderer/ → model/view/       (BackgroundStyle)
```

renderer/ はcanvas/内で最も多くの依存を持つコンポーネントであるが、
すべて参照方向（読み取り）であり、model/ やviewport/ を変更しない。

---

## 8. 不変条件

1. **Rendererは描画のみを行い、model/ のデータを変更しない**
2. **Canvas 2D API の呼び出しはrenderer/内に閉じ込める**
3. **描画順序: 背景 → Edge → Node → Annotation → オーバーレイ**
4. **DormancyVisual.visible=false のNodeは描画しない**
5. **各フレームでcanvas全体をクリアしてから再描画する**

---

## 9. 描画パイプラインの流れ

```
requestAnimationFrame コールバック
  │
  ├─ 1. canvas全体をクリア
  ├─ 2. ctx.save() + カメラ変換行列を適用
  ├─ 3. 背景描画 (draw-background.ts)
  ├─ 4. ビューポート外のNodeをカリング
  ├─ 5. Edge描画 (draw-edge.ts)
  ├─ 6. Node描画 (draw-node.ts)
  │     ├─ EpistemicState → opacity/stroke調整
  │     ├─ DormancyState → opacity/scale調整
  │     ├─ Payload種別に応じた内容描画
  │     └─ 選択/ホバー状態のオーバーレイ
  ├─ 7. Annotation描画 (draw-annotation.ts)
  ├─ 8. ctx.restore()
  └─ 9. RenderStats の算出
```
