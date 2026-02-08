# model/node/ — Node実体コンポーネント

## 1. 概要

本コンポーネントはKakicom PKMにおける**思考の最小単位 = Node**を定義する。
Nodeが保持するPayload（中身）とEpistemicState（確信度）もここに含む。

Nodeはシステム全体の中心的エンティティであり、
他のすべてのコンポーネント（Event, Projection, View, Canvas, Storage）がNodeを参照する。

---

## 2. 責務

- Node エンティティの型定義
- Payload（テキスト / 画像 / 混合）の型定義と判別
- EpistemicState（確信度）の型定義と順序関係
- NodeKind の型定義
- Nodeの生成ファクトリ関数
- Nodeの等価判定（IDベース）
- Payloadに対する純粋な変換・判定ユーティリティ

### 責務に含まれないもの

- Nodeの空間的位置（→ canvas/viewport/ または projection/）
- Nodeの変化履歴（→ event/）
- Nodeの忘却状態（→ meta/）
- Nodeの永続化（→ storage/）

---

## 3. 設計原則

1. **Nodeは不変オブジェクトとして扱う** — 変更は新しいNodeの生成で表現する
2. **IDのみが同一性の根拠** — 同じIDなら同じNode
3. **Payloadは交換可能** — テキスト↔画像↔混合の変換を妨げない
4. **EpistemicStateのデフォルトはUnsure** — 未知が正常

---

## 4. 公開データ構造

### 4.1 NodeId

```typescript
/**
 * Nodeの一意識別子。
 * ブランド型で string と区別する。
 */
type NodeId = string & { readonly __brand: "NodeId" };
```

### 4.2 Node

```typescript
/**
 * 思考の最小単位。
 * 完成している必要はなく、未整理・未確定が正常状態。
 *
 * 注意:
 *   - 階層・フォルダ・タグを持たない
 *   - 空間的位置を持たない（Projection/Viewの責務）
 *   - 変化履歴を持たない（ThoughtEventの責務）
 */
interface Node {
  readonly id: NodeId;
  readonly payload: Payload;
  readonly kind: NodeKind;
  readonly epistemicState: EpistemicState;
  readonly createdAt: Timestamp;
}
```

### 4.3 Payload

```typescript
/**
 * Nodeの中身。
 * discriminated union で種別を判定する。
 */
type Payload = TextPayload | ImagePayload | MixedPayload;

/**
 * 生のテキスト断片。
 * Markdown等の構造は持たない。
 */
interface TextPayload {
  readonly type: "text";
  readonly text: string;
}

/**
 * スクリーンショット・図・写真。
 * 実データはblob-storeに保存し、ここではIDで参照する。
 */
interface ImagePayload {
  readonly type: "image";
  readonly blobId: BlobId;
  readonly mime: string;
  readonly width: number;
  readonly height: number;
}

/**
 * 画像 + 後付けメモ（最頻出ユースケース）。
 * スクショを貼ってから一言メモを添えるパターン。
 */
interface MixedPayload {
  readonly type: "mixed";
  readonly blobId: BlobId;
  readonly mime: string;
  readonly width: number;
  readonly height: number;
  readonly memo: string;
}
```

### 4.4 NodeKind

```typescript
/**
 * Nodeの大まかな分類。
 * Payloadの種別とは独立した意味的カテゴリ。
 *
 * MVP段階では note のみを使用し、
 * 他の種別は将来のProjectionやViewで活用する。
 */
type NodeKind =
  | "note"       // 通常の思考メモ
  | "question"   // 問い・疑問
  | "reference"  // 外部資料の引用・参照
  | "anchor";    // 思考空間の目印・ランドマーク
```

### 4.5 EpistemicState

```typescript
/**
 * Nodeの確信度。
 * 「このNodeの内容をどの程度信じているか」を示す。
 *
 * View側で色・透明度・枠線スタイルに反映され、
 * LLM連携時には質問強度の制御にも使用する。
 *
 * 順序: Certain > Likely > Hypothesis > Speculative > Unsure
 */
type EpistemicState =
  | "certain"
  | "likely"
  | "hypothesis"
  | "speculative"
  | "unsure";
```

### 4.6 共通型

```typescript
/**
 * Unix ミリ秒タイムスタンプ。
 */
type Timestamp = number & { readonly __brand: "Timestamp" };

/**
 * blob-store 内のバイナリデータへの参照ID。
 */
type BlobId = string & { readonly __brand: "BlobId" };
```

---

## 5. 公開インターフェース

### 5.1 Node生成

```typescript
/**
 * 新しいNodeを生成する。
 * IDは内部で一意生成される。
 * epistemicState は省略時 "unsure" をデフォルトとする。
 */
function createNode(params: {
  payload: Payload;
  kind?: NodeKind;
  epistemicState?: EpistemicState;
}): Node;
```

### 5.2 Node更新（イミュータブル）

```typescript
/**
 * Nodeの一部フィールドを差し替えた新しいNodeを返す。
 * 元のNodeは変更されない。
 */
function updateNode(
  node: Node,
  patch: Partial<Pick<Node, "payload" | "kind" | "epistemicState">>
): Node;
```

### 5.3 Payload判定

```typescript
/**
 * PayloadがテキストのみかどうかをType Guardで判定する。
 */
function isTextPayload(p: Payload): p is TextPayload;

/**
 * Payloadが画像を含むかどうかを判定する。
 * ImagePayload と MixedPayload の両方で true を返す。
 */
function hasImage(p: Payload): p is ImagePayload | MixedPayload;

/**
 * Payloadからテキスト部分を抽出する。
 * TextPayload → text, MixedPayload → memo, ImagePayload → ""
 */
function extractText(p: Payload): string;

/**
 * PayloadからBlobIdを抽出する。
 * ImagePayload / MixedPayload → blobId, TextPayload → null
 */
function extractBlobId(p: Payload): BlobId | null;
```

### 5.4 EpistemicState 操作

```typescript
/**
 * EpistemicStateの確信度順序を数値で返す。
 * certain=4, likely=3, hypothesis=2, speculative=1, unsure=0
 */
function epistemicWeight(state: EpistemicState): number;

/**
 * 二つのEpistemicStateのうち、より確信度が高い方を返す。
 */
function higherEpistemic(
  a: EpistemicState,
  b: EpistemicState
): EpistemicState;

/**
 * 全EpistemicStateを確信度順に並べた配列を返す。
 */
const EPISTEMIC_ORDER: readonly EpistemicState[];
```

### 5.5 ID生成

```typescript
/**
 * 一意なNodeIdを生成する。
 * 内部でcrypto.randomUUID()相当の生成を行う。
 */
function generateNodeId(): NodeId;

/**
 * 一意なBlobIdを生成する。
 */
function generateBlobId(): BlobId;

/**
 * 一意なTimestampを生成する（現在時刻）。
 */
function now(): Timestamp;
```

---

## 6. ファイル構成（想定）

```
model/node/
├── COMPONENT.md      # 本ドキュメント
├── types.ts          # Node, Payload, EpistemicState, NodeKind 等の型定義
├── factory.ts        # createNode, generateNodeId 等の生成関数
├── payload.ts        # Payload関連のユーティリティ（判定・抽出）
├── epistemic.ts      # EpistemicState関連のユーティリティ
└── index.ts          # 公開APIの再エクスポート
```

---

## 7. 依存関係

```
model/node/ → (依存なし)
```

node/ はmodel/内で最も基底のコンポーネントであり、
model/内の他コンポーネント（event/, projection/, view/, meta/）がnode/に依存する。

node/ が他のmodel/コンポーネントに依存することはない。

---

## 8. 不変条件

1. **Node.id は生成後に変更されない**
2. **Node.createdAt は生成後に変更されない**
3. **EpistemicStateの初期値は "unsure"**
4. **NodeKindの初期値は "note"**
5. **ImagePayload / MixedPayload のblobIdは空文字列を許容しない**
6. **TextPayload.textは空文字列を許容する**（書きかけの状態が正常）
7. **Payload.typeフィールドでdiscriminated unionの判別を行う**

---

## 9. 設計判断の根拠

### なぜNodeに位置情報を持たせないか

Nodeの空間配置はProjectionの出力であり、
同一Nodeが異なるViewで異なる位置に表示される可能性がある。
位置をNodeに持たせると単一の配置に固定されてしまう。

### なぜPayloadをunion typeにするか

将来的にAudioPayload, LinkPayload等を追加する際、
discriminated unionであれば型安全に拡張できる。
クラス継承よりも合成的で、Rust enumへの移植も容易。

### なぜNodeKindとPayload.typeを分離するか

Kindは「意味的カテゴリ」、Payload.typeは「データ形式」。
画像のquestion（画像で問いを提示）や、
テキストのreference（文章の引用）が存在しうるため、直交させる。
