# model/meta/ — メタ認知コンポーネント

## 1. 概要

本コンポーネントはNodeに付随する**メタ認知的な概念**を定義する。
Voice（思考主体）、Salience（注意の強さ）、Dormancy（忘却・休眠）の
3概念を束ねる。

これらはNode自体の構成要素ではなく、
Nodeに対する「誰が」「どれだけ注目すべきか」「どれだけ活性か」という
認知的文脈を付与するメタ情報である。

---

## 2. 責務

- Voice（思考主体）の型定義と判別
- Salience（注意の強さ）の型定義と算出ロジック
- DormancyState（忘却・休眠）の型定義と状態遷移ロジック
- メタ情報の生成・更新ファクトリ関数

### 責務に含まれないもの

- Node本体の管理（→ model/node/）
- メタ情報に基づく描画（→ canvas/renderer/）
- メタ情報の永続化（→ storage/）
- Salience算出のための外部データ取得（→ 上位層）

---

## 3. 設計原則

1. **Nodeを汚染しない** — メタ情報はNodeの外側から付与する
2. **算出ロジックは純粋関数** — 副作用なし、入力から一意に決まる
3. **デフォルトを明示する** — Voice=Self, Salience=0, Dormancy=Active
4. **状態遷移を型で制約する** — 不正な遷移を型レベルで防ぐ

---

## 4. 公開データ構造

### 4.1 Voice — 思考主体

```typescript
/**
 * 誰の視点・発話かを区別するための概念。
 *
 * LLMの意見と自分の仮説を混同しないために必要。
 * 理解の「所有権」を可視化する。
 *
 * Node, Annotation, ThoughtEvent に付与して使用する。
 */
type Voice = SelfVoice | LLMVoice | FutureSelfVoice | ExternalVoice;

/**
 * 自分自身の思考。デフォルト。
 */
interface SelfVoice {
  readonly type: "self";
}

/**
 * LLMが生成した思考・提案。
 * name でどのLLMかを識別する。
 */
interface LLMVoice {
  readonly type: "llm";
  readonly name: string;
}

/**
 * 未来の自分に向けたメモ・注意書き。
 * 「後で確認する」「ここは怪しい」等。
 */
interface FutureSelfVoice {
  readonly type: "future_self";
}

/**
 * 外部ソースからの引用・参照。
 * 書籍、論文、Webページ等。
 */
interface ExternalVoice {
  readonly type: "external";
  readonly source: string;
}
```

### 4.2 VoiceAttribution

```typescript
/**
 * 特定Nodeに対するVoiceの帰属情報。
 * 「このNodeの内容は誰が書いたか / 誰の意見か」を記録する。
 */
interface VoiceAttribution {
  readonly nodeId: NodeId;
  readonly voice: Voice;
  readonly assignedAt: Timestamp;
}
```

### 4.3 Salience — 注意の強さ

```typescript
/**
 * Nodeに対する注意の重み。
 * 「今どこを見るべきか」を支援する概念。
 *
 * 検索（能動的に探す）ではなく、
 * 注目（受動的に気づく）を支援するために使う。
 *
 * weightは0.0〜1.0の範囲。高いほど注目度が高い。
 */
interface Salience {
  readonly nodeId: NodeId;
  readonly weight: number;
  readonly reason: SalienceReason | null;
  readonly computedAt: Timestamp;
}

/**
 * Salienceの算出理由。
 * 何故このNodeの注目度が高いのかを説明する。
 */
type SalienceReason =
  | RecentlyTouchedReason
  | HighlyLinkedReason
  | LLMHighlightedReason
  | UserPinnedReason
  | UnsureEpistemicReason;

interface RecentlyTouchedReason {
  readonly type: "recently_touched";
  readonly lastEventAt: Timestamp;
}

interface HighlyLinkedReason {
  readonly type: "highly_linked";
  readonly linkCount: number;
}

interface LLMHighlightedReason {
  readonly type: "llm_highlighted";
  readonly llmName: string;
  readonly explanation: string;
}

interface UserPinnedReason {
  readonly type: "user_pinned";
}

interface UnsureEpistemicReason {
  readonly type: "unsure_epistemic";
  readonly currentState: EpistemicState;
}
```

### 4.4 SalienceFactor

```typescript
/**
 * Salience算出時の入力要素。
 * 複数のFactorを統合してweightを算出する。
 */
interface SalienceFactor {
  readonly source: string;
  readonly weight: number;
  readonly reason: SalienceReason;
}
```

### 4.5 DormancyState — 忘却・休眠

```typescript
/**
 * Nodeの活性状態。
 * 使われないNodeは自然に薄れ、必要になれば再浮上する。
 *
 * PKMを脳の代替とするなら、忘却も第一級概念。
 *
 * 状態遷移:
 *   Active → Cooling → Dormant → Archived
 *   (逆方向の遷移も可能: 再浮上)
 *   Archived → Active (明示的な復帰)
 */
type DormancyState =
  | "active"     // 活性状態。通常表示。
  | "cooling"    // 冷却中。やや退色して表示。
  | "dormant"    // 休眠中。大幅に退色し縮小表示。
  | "archived";  // アーカイブ済。デフォルト非表示。
```

### 4.6 DormancyRecord

```typescript
/**
 * NodeごとのDormancy状態記録。
 */
interface DormancyRecord {
  readonly nodeId: NodeId;
  readonly state: DormancyState;
  readonly lastActiveAt: Timestamp;
  readonly transitionedAt: Timestamp;
}
```

### 4.7 DormancyPolicy

```typescript
/**
 * Dormancy自動遷移のポリシー。
 * 一定期間操作がないNodeを自動的にCooling / Dormantに遷移させる。
 */
interface DormancyPolicy {
  /** Active → Cooling に遷移するまでの無操作期間（ミリ秒） */
  readonly coolingThresholdMs: number;

  /** Cooling → Dormant に遷移するまでの無操作期間（ミリ秒） */
  readonly dormantThresholdMs: number;

  /** Dormant → Archived に自動遷移するか（falseなら手動のみ） */
  readonly autoArchive: boolean;

  /** autoArchive=true の場合の無操作期間（ミリ秒） */
  readonly archiveThresholdMs: number | null;
}
```

---

## 5. 公開インターフェース

### 5.1 Voice 生成・判定

```typescript
/**
 * Self Voice を生成する。
 */
function selfVoice(): SelfVoice;

/**
 * LLM Voice を生成する。
 */
function llmVoice(name: string): LLMVoice;

/**
 * FutureSelf Voice を生成する。
 */
function futureSelfVoice(): FutureSelfVoice;

/**
 * External Voice を生成する。
 */
function externalVoice(source: string): ExternalVoice;

/**
 * VoiceがLLM由来かどうかを判定する。
 */
function isLLMVoice(voice: Voice): voice is LLMVoice;

/**
 * Voiceの表示ラベルを返す。
 */
function voiceLabel(voice: Voice): string;

/**
 * VoiceAttributionを生成する。
 */
function attributeVoice(nodeId: NodeId, voice: Voice): VoiceAttribution;
```

### 5.2 Salience 算出・操作

```typescript
/**
 * 複数のSalienceFactorからSalienceを算出する。
 * Factorのweightを正規化して0.0〜1.0に収める。
 */
function computeSalience(
  nodeId: NodeId,
  factors: readonly SalienceFactor[]
): Salience;

/**
 * 時間減衰を考慮したSalienceFactorを生成する。
 * 最後にNodeが操作された時刻からの経過時間でweightが減衰する。
 */
function recencyFactor(lastEventAt: Timestamp, now: Timestamp): SalienceFactor;

/**
 * リンク数に基づくSalienceFactorを生成する。
 */
function linkCountFactor(linkCount: number): SalienceFactor;

/**
 * EpistemicStateに基づくSalienceFactorを生成する。
 * Unsureなほどweightが高い（注目すべき）。
 */
function epistemicFactor(state: EpistemicState): SalienceFactor;

/**
 * Salience配列をweight降順でソートする。
 */
function sortByWeight(saliences: readonly Salience[]): Salience[];

/**
 * デフォルトのSalience（weight=0）を生成する。
 */
function defaultSalience(nodeId: NodeId): Salience;
```

### 5.3 Dormancy 状態遷移

```typescript
/**
 * デフォルトのDormancyPolicyを返す。
 */
function defaultDormancyPolicy(): DormancyPolicy;

/**
 * DormancyRecordを初期状態（Active）で生成する。
 */
function initDormancy(nodeId: NodeId): DormancyRecord;

/**
 * 最終操作時刻とポリシーに基づき、次のDormancyStateを判定する。
 * 遷移が不要ならnullを返す。
 */
function evaluateDormancy(
  record: DormancyRecord,
  policy: DormancyPolicy,
  now: Timestamp
): DormancyState | null;

/**
 * DormancyRecordの状態を遷移させる（新しいRecordを返す）。
 */
function transitionDormancy(
  record: DormancyRecord,
  newState: DormancyState
): DormancyRecord;

/**
 * Nodeを再浮上させる（Active状態に戻す）。
 */
function reactivate(record: DormancyRecord): DormancyRecord;

/**
 * DormancyStateの深さを数値で返す。
 * active=0, cooling=1, dormant=2, archived=3
 */
function dormancyDepth(state: DormancyState): number;

/**
 * 全DormancyStateを深さ順に並べた配列を返す。
 */
const DORMANCY_ORDER: readonly DormancyState[];
```

---

## 6. ファイル構成（想定）

```
model/meta/
├── COMPONENT.md       # 本ドキュメント
├── voice.ts           # Voice, VoiceAttribution 型と生成・判定関数
├── salience.ts        # Salience, SalienceFactor, SalienceReason 型と算出ロジック
├── dormancy.ts        # DormancyState, DormancyRecord, DormancyPolicy 型と遷移ロジック
└── index.ts           # 公開APIの再エクスポート
```

---

## 7. 依存関係

```
model/meta/ → model/node/  (NodeId, Timestamp, EpistemicState を参照)
```

meta/ は node/ の型のみに依存する。
event/, projection/, view/ には依存しない。

逆方向:
- event/ は DormancyState を参照する（dormancy_changed イベント用）
- view/ は DormancyState の概念をViewConfigで参照する
- canvas/renderer/ は DormancyState を視覚マッピングで使用する

---

## 8. 不変条件

1. **Voice のデフォルトは SelfVoice**
2. **Salience.weight は 0.0 以上 1.0 以下**
3. **Salience のデフォルト weight は 0.0**
4. **DormancyState のデフォルトは "active"**
5. **DormancyRecord.lastActiveAt ≤ DormancyRecord.transitionedAt**
6. **DormancyPolicy の閾値は正の数値**
7. **reactivate() は常に "active" を返す**（中間状態を飛ばす）

---

## 9. 設計判断の根拠

### なぜVoiceをNodeの外に置くか

Nodeの Payload は「何を考えたか」、Voiceは「誰が考えたか」。
同じNodeに複数のVoiceが関与する場合もある
（自分のメモにLLMが注釈を付けるなど）。
Nodeに直接持たせると1 Node = 1 Voiceに固定されてしまう。

### なぜSalienceを動的に算出するか

注目度は時間とともに変化する。
最近触ったNodeの注目度は高く、放置すると低下する。
静的な値として保存するのではなく、
算出タイミングで複数Factorから動的に計算する設計が適切。

### なぜDormancyの自動遷移にポリシーを使うか

忘却の速度は個人の好みや用途によって異なる。
ハードコードではなくポリシーとして外部化することで、
ユーザーや用途に応じた調整が可能になる。

### MVPでの実装範囲

- Voice: SelfVoice のみ実装。LLM連携時に他Voiceを追加。
- Salience: recencyFactor のみ実装。他Factorは後回し。
- Dormancy: Active のみ使用。自動遷移はMVP後。
