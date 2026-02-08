# model/projection/ — Projectionコンポーネント

## 1. 概要

本コンポーネントは**Projection（意味変換）**を定義する。
ProjectionはNode集合を受け取り、空間座標・関係線・注釈などの
**解釈的データ**を出力する写像操作である。

Projectionの核心的な制約は**Nodeを変更しない**こと。
入力されたNodeに対して「別の見方」を付与するだけであり、
元のNodeのPayloadやEpistemicStateには一切影響しない。

---

## 2. 責務

- Projection エンティティの型定義
- ProjectionOutput（位置・辺・注釈）の型定義
- Transform（変換仕様）の型定義
- Edge（Node間の関係線）の型定義
- Annotation（注釈）の型定義
- Position（空間座標）の型定義

### 責務に含まれないもの

- 具体的な変換アルゴリズムの実装（→ 上位層 or 将来のLLM連携）
- 空間座標からの描画（→ canvas/renderer/）
- Projectionの永続化（→ storage/）

---

## 3. 設計原則

1. **Nodeを変更しない** — Projectionは読み取り専用の写像
2. **出力は宣言的データ** — 「何を表示するか」であり「どう描画するか」ではない
3. **Transformは記述的** — アルゴリズムそのものではなく、何をしたいかの仕様
4. **複数Projectionを合成可能** — 一つのViewが複数Projectionを持てる
5. **LLMが提案、人間が確定** — Projection案の生成はLLMの役割、適用は人間の判断

---

## 4. 公開データ構造

### 4.1 ProjectionId

```typescript
/**
 * Projectionの一意識別子。
 */
type ProjectionId = string & { readonly __brand: "ProjectionId" };
```

### 4.2 Projection

```typescript
/**
 * Node集合を別の意味空間へ写像する操作。
 *
 * inputNodesに指定されたNode群に対してtransformを適用し、
 * outputとして位置・辺・注釈を生成する。
 *
 * 不変条件:
 *   - inputNodes内のNodeを変更しない
 *   - outputはtransformとinputNodesから決定的に導出可能
 */
interface Projection {
  readonly id: ProjectionId;
  readonly name: string;
  readonly description: string;
  readonly inputNodes: readonly NodeId[];
  readonly transform: Transform;
  readonly output: ProjectionOutput;
  readonly createdAt: Timestamp;
}
```

### 4.3 Transform

```typescript
/**
 * 変換の仕様を記述するデータ。
 * 具体的なアルゴリズム実装はTransformTypeごとに上位層が担当する。
 *
 * Transformは「何をしたいか」の宣言であり、
 * 「どう計算するか」の手続きではない。
 */
type Transform =
  | ManualTransform
  | SpatialClusterTransform
  | LogicalStructureTransform
  | DependencyTransform
  | TimelineTransform
  | CustomTransform;

/**
 * ユーザーが手動で配置した結果をそのまま保持する。
 * MVP段階の主要なTransform。
 */
interface ManualTransform {
  readonly type: "manual";
}

/**
 * Node間の類似性に基づいて空間クラスタリングする。
 * LLMが類似度を判定し、近いNodeを近くに配置する。
 */
interface SpatialClusterTransform {
  readonly type: "spatial_cluster";
  readonly similarityMetric: string;
  readonly clusterCount: number | null;
}

/**
 * 論理的な構造（前提→結論、原因→結果）を抽出する。
 */
interface LogicalStructureTransform {
  readonly type: "logical_structure";
  readonly structureType: "causal" | "prerequisite" | "argument";
}

/**
 * Node間の依存関係を抽出する。
 */
interface DependencyTransform {
  readonly type: "dependency";
  readonly dependencyType: string;
}

/**
 * 時系列に沿ってNodeを配列する。
 */
interface TimelineTransform {
  readonly type: "timeline";
  readonly timeField: "created_at" | "last_event";
}

/**
 * ユーザーまたはLLMが定義したカスタム変換。
 * 将来の拡張ポイント。
 */
interface CustomTransform {
  readonly type: "custom";
  readonly name: string;
  readonly params: Record<string, unknown>;
}
```

### 4.4 ProjectionOutput

```typescript
/**
 * Projectionの出力。
 * 位置・辺・注釈の3要素からなる。
 * すべて省略可能で、Transformの種類に応じて出力される。
 */
interface ProjectionOutput {
  readonly positions: ReadonlyMap<NodeId, Position>;
  readonly edges: readonly Edge[];
  readonly annotations: readonly Annotation[];
}
```

### 4.5 Position

```typescript
/**
 * ワールド座標上の位置。
 * canvas/viewport/ と共有する空間概念。
 */
interface Position {
  readonly x: number;
  readonly y: number;
}
```

### 4.6 Edge

```typescript
/**
 * 二つのNode間の関係線。
 * Projectionが出力する構造的情報。
 */
interface Edge {
  readonly sourceNodeId: NodeId;
  readonly targetNodeId: NodeId;
  readonly relation: EdgeRelation;
  readonly label: string | null;
  readonly weight: number;
}

/**
 * Edge の意味的種別。
 */
type EdgeRelation =
  | "causal"         // 因果関係
  | "prerequisite"   // 前提条件
  | "similar"        // 類似
  | "contradicts"    // 矛盾
  | "depends_on"     // 依存
  | "associated"     // 一般的な関連
  | "custom";        // カスタム
```

### 4.7 Annotation

```typescript
/**
 * Projectionが出力する注釈・質問・警告。
 * Nodeに対するメタ的コメントであり、Nodeを変更しない。
 */
interface Annotation {
  readonly id: string;
  readonly targetNodeId: NodeId;
  readonly kind: AnnotationKind;
  readonly content: string;
  readonly voiceType: "self" | "llm" | "future_self" | "external";
}

/**
 * 注釈の種別。
 */
type AnnotationKind =
  | "note"       // 補足メモ
  | "question"   // 問い・疑問の提示
  | "warning"    // 矛盾・不整合の指摘
  | "suggestion" // 構造変更の提案
  | "gap";       // 欠落・盲点の指摘
```

---

## 5. 公開インターフェース

### 5.1 Projection 生成

```typescript
/**
 * 新しいProjectionを生成する。
 * 初期状態ではoutputは空。
 */
function createProjection(params: {
  name: string;
  description?: string;
  inputNodes: readonly NodeId[];
  transform: Transform;
}): Projection;

/**
 * ManualTransform のProjectionを簡易生成する（MVP用）。
 */
function createManualProjection(params: {
  name: string;
  inputNodes: readonly NodeId[];
  positions: ReadonlyMap<NodeId, Position>;
}): Projection;
```

### 5.2 ProjectionOutput 操作

```typescript
/**
 * 空のProjectionOutputを生成する。
 */
function emptyOutput(): ProjectionOutput;

/**
 * 既存のProjectionOutputにpositionを追加・更新する。
 */
function setPosition(
  output: ProjectionOutput,
  nodeId: NodeId,
  position: Position
): ProjectionOutput;

/**
 * 既存のProjectionOutputにedgeを追加する。
 */
function addEdge(
  output: ProjectionOutput,
  edge: Edge
): ProjectionOutput;

/**
 * 既存のProjectionOutputにannotationを追加する。
 */
function addAnnotation(
  output: ProjectionOutput,
  annotation: Annotation
): ProjectionOutput;

/**
 * 二つのProjectionOutputをマージする。
 * positionsは後勝ち、edges/annotationsは結合。
 */
function mergeOutputs(
  a: ProjectionOutput,
  b: ProjectionOutput
): ProjectionOutput;
```

### 5.3 Edge / Annotation 生成

```typescript
/**
 * Edgeを生成する。
 */
function createEdge(params: {
  sourceNodeId: NodeId;
  targetNodeId: NodeId;
  relation: EdgeRelation;
  label?: string;
  weight?: number;
}): Edge;

/**
 * Annotationを生成する。
 */
function createAnnotation(params: {
  targetNodeId: NodeId;
  kind: AnnotationKind;
  content: string;
  voiceType?: "self" | "llm" | "future_self" | "external";
}): Annotation;
```

### 5.4 Position ユーティリティ

```typescript
/**
 * 二点間の距離を計算する。
 */
function distance(a: Position, b: Position): number;

/**
 * 位置を平行移動する。
 */
function translate(pos: Position, dx: number, dy: number): Position;

/**
 * Position集合の重心を計算する。
 */
function centroid(positions: readonly Position[]): Position;
```

---

## 6. ファイル構成（想定）

```
model/projection/
├── COMPONENT.md       # 本ドキュメント
├── types.ts           # Projection, Transform, ProjectionOutput, Edge, Annotation, Position
├── factory.ts         # createProjection, createEdge, createAnnotation 等
├── output.ts          # ProjectionOutput操作（set, add, merge）
├── position.ts        # Position ユーティリティ（distance, translate, centroid）
└── index.ts           # 公開APIの再エクスポート
```

---

## 7. 依存関係

```
model/projection/ → model/node/  (NodeId を参照)
```

projection/ は node/ のID型のみに依存する。
event/ や view/ には依存しない。

---

## 8. 不変条件

1. **ProjectionはinputNodes内のNodeを変更しない**
2. **ProjectionOutput.positionsのキーはinputNodesの部分集合**
3. **Edge.sourceNodeIdとEdge.targetNodeIdはinputNodesに含まれる**
4. **Annotation.targetNodeIdはinputNodesに含まれる**
5. **Edge.weightは0以上1以下**（正規化済み）
6. **ManualTransformのProjectionはLLMが自動更新しない**
