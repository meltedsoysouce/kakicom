# model/view/ — Viewコンポーネント

## 1. 概要

本コンポーネントは**View（認知レンズ）**を定義する。
ViewはProjection + InteractionMode + Affordanceの組み合わせであり、
同一のNode集合に対して「異なる見方」を提供する。

Viewを切り替えることで、同じ思考空間を
探索・学習・創作・デバッグなど異なる目的で活用できる。
用途ごとにアプリケーションを分けない設計の要となるコンポーネントである。

---

## 2. 責務

- View エンティティの型定義
- InteractionMode（操作モード）の型定義と特性記述
- Affordance（UIが提供する操作可能性）の型定義
- ViewPreset（事前定義されたView構成）の定義
- Viewの生成・更新ファクトリ関数
- InteractionModeに応じたAffordance解決ロジック

### 責務に含まれないもの

- Viewの描画（→ canvas/renderer/）
- Viewの永続化（→ storage/）
- Projectionの算出（→ model/projection/ + 上位層）
- 具体的なUI部品の実装（→ canvas/）

---

## 3. 設計原則

1. **Viewはデータであり手続きではない** — UIの「設定」を宣言的に記述する
2. **Projection合成** — 一つのViewが複数のProjectionを重ね合わせる
3. **InteractionModeが操作を制約する** — モードに応じて可能な操作が変わる
4. **Affordanceは提案であり強制ではない** — UIが「できること」を示すだけ

---

## 4. 公開データ構造

### 4.1 ViewId

```typescript
/**
 * Viewの一意識別子。
 */
type ViewId = string & { readonly __brand: "ViewId" };
```

### 4.2 View

```typescript
/**
 * 認知レンズ。
 * Projection群 + InteractionMode + Affordanceの組み合わせ。
 *
 * 同一Node集合に対して複数のViewが存在しうる。
 * Viewを切り替えることで「見方」を変える。
 */
interface View {
  readonly id: ViewId;
  readonly name: string;
  readonly description: string;
  readonly projections: readonly ProjectionId[];
  readonly interactionMode: InteractionMode;
  readonly affordances: readonly Affordance[];
  readonly config: ViewConfig;
  readonly createdAt: Timestamp;
}
```

### 4.3 InteractionMode

```typescript
/**
 * ユーザーがNodeと空間に対してどう関わるかを定義するモード。
 *
 * 各モードはAffordance集合のデフォルトを決定し、
 * canvas/input/ のイベント解釈に影響する。
 */
type InteractionMode =
  | "free_explore"   // 自由探索：制約なし、全操作可能
  | "organize"       // 整理：配置・グルーピング・リンク操作が中心
  | "explain"        // 説明：注釈・Annotationの閲覧が中心
  | "debug"          // デバッグ：依存関係・仮説検証に集中
  | "reflect";       // 振り返り：時系列・Session履歴の参照
```

### 4.4 InteractionModeDescriptor

```typescript
/**
 * InteractionModeの特性を記述するメタデータ。
 * UIヘルプやモード切替時のガイド表示に使用する。
 */
interface InteractionModeDescriptor {
  readonly mode: InteractionMode;
  readonly label: string;
  readonly description: string;
  readonly defaultAffordances: readonly Affordance[];
  readonly suggestedTransforms: readonly Transform["type"][];
}
```

### 4.5 Affordance

```typescript
/**
 * Viewが提供する操作可能性。
 * UIが「何ができるか」をユーザーに示すためのデータ。
 *
 * canvas/input/ はAffordanceリストを参照して
 * 入力イベントの解釈を切り替える。
 */
type Affordance =
  | "pan"                // キャンバスのパン（常時有効）
  | "zoom"               // キャンバスのズーム（常時有効）
  | "select_node"        // Nodeの選択
  | "drag_node"          // Nodeのドラッグ移動
  | "create_node"        // Nodeの新規作成
  | "edit_node"          // Nodeの内容編集
  | "delete_node"        // Nodeの削除（Dormancy.Archivedへ遷移）
  | "link_nodes"         // Node間のリンク作成
  | "unlink_nodes"       // Node間のリンク解除
  | "paste_image"        // 画像ペーストによるNode生成
  | "change_epistemic"   // EpistemicStateの変更
  | "view_annotations"   // Annotationの表示
  | "view_edges"         // Edgeの表示
  | "view_history"       // ThoughtEvent履歴の表示
  | "switch_mode";       // InteractionModeの切替
```

### 4.6 ViewConfig

```typescript
/**
 * Viewの表示設定。
 * 描画時の視覚的パラメータを保持する。
 */
interface ViewConfig {
  /** 背景スタイル */
  readonly background: BackgroundStyle;

  /** DormancyState=Dormant のNodeを表示するか */
  readonly showDormant: boolean;

  /** DormancyState=Archived のNodeを表示するか */
  readonly showArchived: boolean;

  /** Edgeを表示するか */
  readonly showEdges: boolean;

  /** Annotationを表示するか */
  readonly showAnnotations: boolean;

  /** EpistemicStateに基づく視覚的強弱を適用するか */
  readonly epistemicVisuals: boolean;

  /** DormancyStateに基づく退色を適用するか */
  readonly dormancyVisuals: boolean;
}

/**
 * キャンバス背景のスタイル。
 */
type BackgroundStyle =
  | "none"            // 無地
  | "dot_grid"        // ドットグリッド
  | "line_grid";      // 線グリッド
```

### 4.7 ViewPreset

```typescript
/**
 * 事前定義されたView構成。
 * ユーザーが選択する「テンプレート」として機能する。
 */
interface ViewPreset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly interactionMode: InteractionMode;
  readonly defaultConfig: ViewConfig;
  readonly suggestedAffordances: readonly Affordance[];
}
```

---

## 5. 公開インターフェース

### 5.1 View 生成・更新

```typescript
/**
 * 新しいViewを生成する。
 */
function createView(params: {
  name: string;
  description?: string;
  projections?: readonly ProjectionId[];
  interactionMode?: InteractionMode;
  config?: Partial<ViewConfig>;
}): View;

/**
 * ViewPresetからViewを生成する。
 */
function createViewFromPreset(
  preset: ViewPreset,
  projections: readonly ProjectionId[]
): View;

/**
 * Viewの一部フィールドを差し替えた新しいViewを返す。
 */
function updateView(
  view: View,
  patch: Partial<Pick<View, "name" | "description" | "projections" | "interactionMode" | "affordances" | "config">>
): View;
```

### 5.2 InteractionMode 操作

```typescript
/**
 * InteractionModeのDescriptorを取得する。
 */
function getModeDescriptor(mode: InteractionMode): InteractionModeDescriptor;

/**
 * 全InteractionModeのDescriptorリストを取得する。
 */
function getAllModeDescriptors(): readonly InteractionModeDescriptor[];

/**
 * InteractionModeに応じたデフォルトAffordanceを解決する。
 */
function resolveAffordances(mode: InteractionMode): readonly Affordance[];
```

### 5.3 Affordance 判定

```typescript
/**
 * 現在のViewで特定のAffordanceが利用可能かを判定する。
 */
function hasAffordance(view: View, affordance: Affordance): boolean;

/**
 * ViewのAffordanceリストにaffordanceを追加した新しいViewを返す。
 * 既に存在する場合は元のViewをそのまま返す。
 */
function enableAffordance(view: View, affordance: Affordance): View;

/**
 * ViewのAffordanceリストからaffordanceを除去した新しいViewを返す。
 */
function disableAffordance(view: View, affordance: Affordance): View;
```

### 5.4 ViewConfig 操作

```typescript
/**
 * デフォルトのViewConfigを生成する。
 */
function defaultViewConfig(): ViewConfig;

/**
 * ViewConfigの一部を上書きした新しいViewConfigを返す。
 */
function mergeViewConfig(
  base: ViewConfig,
  overrides: Partial<ViewConfig>
): ViewConfig;
```

### 5.5 ViewPreset 定義

```typescript
/**
 * MVP段階で提供するViewPreset一覧。
 *
 * 探索View: 自由配置、全操作可能、画像・未整理Node中心
 * 学習View: 前提不足・質問の強調表示
 * 創作View: 因果・時系列の可視化
 * デバッグView: 依存・仮説検証の集中表示
 */
const VIEW_PRESETS: readonly ViewPreset[];

/**
 * 探索View（MVPのデフォルトView）。
 */
const EXPLORE_PRESET: ViewPreset;
```

---

## 6. ファイル構成（想定）

```
model/view/
├── COMPONENT.md       # 本ドキュメント
├── types.ts           # View, InteractionMode, Affordance, ViewConfig, ViewPreset
├── factory.ts         # createView, createViewFromPreset, updateView
├── mode.ts            # getModeDescriptor, resolveAffordances
├── affordance.ts      # hasAffordance, enableAffordance, disableAffordance
├── config.ts          # defaultViewConfig, mergeViewConfig
├── presets.ts         # VIEW_PRESETS, EXPLORE_PRESET
└── index.ts           # 公開APIの再エクスポート
```

---

## 7. 依存関係

```
model/view/ → model/projection/  (ProjectionId, Transform["type"] を参照)
model/view/ → model/node/        (Timestamp を参照)
```

view/ は projection/ と node/ の型を参照する。
event/ や meta/ には直接依存しない
（ただしViewConfigの設定で間接的にEpistemicState/DormancyStateの概念を参照する）。

---

## 8. 不変条件

1. **View.projectionsは空配列を許容する**（Projection未設定のView）
2. **View.affordancesは空配列を許容しない**（最低限pan/zoomは含む）
3. **InteractionModeのデフォルトは "free_explore"**
4. **ViewConfigのデフォルトではshowDormant=false, showArchived=false**
5. **ViewPresetは不変データであり実行時に変更しない**

---

## 9. 設計判断の根拠

### なぜAffordanceを列挙型にするか

操作の可否をboolean群で管理すると拡張時に型の変更が広範囲に及ぶ。
列挙型のリストにすることで、新しいAffordanceの追加が型安全かつ局所的。
canvas/input/ がAffordanceリストを参照してイベント解釈を切り替える。

### なぜViewConfigを分離するか

InteractionModeは「操作の文脈」、ViewConfigは「表示の設定」。
同じInteractionModeでも表示設定を変えたい場合がある
（例: 探索モードでグリッド表示ON/OFF）。関心を分離する。

### MVPではどこまで実装するか

MVP段階では EXPLORE_PRESET（探索View）1種類のみ。
InteractionModeは "free_explore" 固定。
他のPreset・Modeは型定義のみ行い、実装は後回し。
