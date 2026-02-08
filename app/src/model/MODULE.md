# model/ — ドメインモデル層

## 1. 概要

本モジュールはKakicom PKMの**純粋なドメインモデル**を定義する。
UI・描画・永続化に一切依存しない型定義とドメインロジックのみを提供する。

ドメインモデルのすべての概念はここに集約される。
他モジュール（canvas/, storage/）は model/ の型に依存するが、
model/ が他モジュールに依存することはない。

---

## 2. 責務

- ドメイン概念の型定義
- 型に付随する純粋な生成・変換・判定ロジック
- ドメインルールの強制（不変条件）

### 責務に含まれないもの

- 描画・座標計算（→ canvas/）
- 永続化・シリアライズ（→ storage/）
- ユーザー入力のハンドリング（→ canvas/ or 上位層）

---

## 3. 設計原則

1. **副作用を持たない** — すべての関数は純粋関数とする
2. **UIに依存しない** — DOM, Canvas, ブラウザAPIへの参照を禁止
3. **単体テスト可能** — ブラウザ環境なしでテストできる
4. **将来のRust移植を意識** — `core/` に1:1対応できる型設計を維持する

---

## 4. 提供する型

### 4.1 Core 層

ドメインモデルの根幹をなす4概念。

#### Node — 思考の最小単位

```
Node {
  id: NodeId
  payload: Payload
  kind: NodeKind
  epistemic_state: EpistemicState
  created_at: Timestamp
}
```

- 注意が一度引っかかったものの記録
- 完成している必要はなく、未整理・未確定が正常状態
- 階層・フォルダ・タグを**持たない**（それらはProjection/Viewの責務）

#### Payload — Nodeの中身

```
Payload =
  | TextPayload { text: string }
  | ImagePayload { blob: Blob, mime: string }
  | MixedPayload { image: ImagePayload, memo: string }
```

- テキストと画像を等価に扱う
- MixedPayloadが最頻出ユースケース（スクショ + メモ）

#### EpistemicState — 確信度

```
EpistemicState =
  | Certain
  | Likely
  | Hypothesis
  | Speculative
  | Unsure
```

- Nodeがどの程度「信じられているか」を示す
- Viewでの色・透明度・強調の制御に使用される
- LLMへの質問強度制御にも利用

#### ThoughtEvent — 思考の変化記録

```
ThoughtEvent {
  id: EventId
  node_id: NodeId
  type: EventType
  timestamp: Timestamp
  session_id?: SessionId
}

EventType =
  | Created
  | Edited
  | Moved
  | Linked
  | Questioned
```

- Nodeは比較的不変、意味はEventに宿る
- イベントソーシング的にNodeの履歴を再構成可能にする

---

### 4.2 Meta 層

Core層を補助し、認知的な文脈を付与する4概念。

#### Session — 探索のまとまり

```
Session {
  id: SessionId
  purpose?: string
  started_at: Timestamp
  ended_at?: Timestamp
}
```

- 学習・デバッグ・創作の一区切り
- ThoughtEventを時間的にグルーピングする
- 後から「思考の流れ」を振り返るための単位

#### Voice — 思考主体

```
Voice =
  | Self
  | LLM { name: string }
  | FutureSelf
  | External { source: string }
```

- 誰の視点・発話かを明示する
- LLMの意見と自分の仮説を混同させない
- 理解の所有権を可視化する

#### Salience — 注意の強さ

```
Salience {
  node_id: NodeId
  weight: number
  reason?: string
}
```

- 「今どこを見るべきか」を支援する概念
- 検索（探す）ではなく注目（気づく）の支援
- 算出ロジック例: 最近触った、多くリンクされている、LLMが注目を促した

#### Dormancy — 忘却・休眠

```
DormancyState =
  | Active
  | Cooling
  | Dormant
  | Archived
```

- 使われないNodeは自然に薄れる
- 必要になれば再浮上する
- PKMを脳の代替とするなら忘却も第一級概念

---

### 4.3 構造概念

#### Projection — 意味変換

```
Projection {
  id: ProjectionId
  input_nodes: NodeId[]
  transform: Transform
  output: ProjectionOutput
}

ProjectionOutput = {
  positions?: Map<NodeId, Position>
  edges?: Edge[]
  annotations?: Annotation[]
}
```

- Node集合を別の意味空間へ写像する操作
- Nodeを**変更しない** — 解釈・構造・注釈を付与するのみ
- model/ では型定義のみ、具体的な変換アルゴリズムは上位層

#### View — 認知レンズ

```
View {
  id: ViewId
  projections: ProjectionId[]
  interaction_mode: InteractionMode
  affordances: Affordance[]
}

InteractionMode =
  | FreeExplore
  | Organize
  | Explain
  | Debug
  | Reflect
```

- Projection + Interaction + UIルールの組み合わせ
- 同一Node集合に対する「見方の違い」を表現
- 用途ごとにアプリを分けない設計の要

---

## 5. モジュール内のファイル構成（想定）

```
model/
├── MODULE.md          # 本ドキュメント
├── node.ts            # Node, Payload, NodeKind
├── epistemic.ts       # EpistemicState
├── event.ts           # ThoughtEvent, EventType
├── session.ts         # Session
├── projection.ts      # Projection, Transform, ProjectionOutput
├── view.ts            # View, InteractionMode, Affordance
├── voice.ts           # Voice
├── salience.ts        # Salience
├── dormancy.ts        # DormancyState
├── ids.ts             # NodeId, EventId, SessionId 等の識別子型
└── index.ts           # 公開APIの再エクスポート
```

---

## 6. 依存関係

```
model/ → (依存なし)

canvas/  → model/  (Nodeの位置・描画にNode型を参照)
storage/ → model/  (ThoughtEventの永続化にEvent型を参照)
```

model/ はプロジェクトの依存グラフにおいて**葉ノード**であり、
他のどのモジュールにも依存してはならない。

---

## 7. 不変条件（ドメインルール）

1. **NodeはIDによってのみ同一性を判定する**
2. **Nodeは階層・タグを直接保持しない**
3. **ProjectionはNodeを変更しない**（読み取り専用の写像）
4. **ThoughtEventは不変**（作成後に編集しない）
5. **EpistemicStateのデフォルトはUnsure**（確信は後から付与）
6. **DormancyStateのデフォルトはActive**（新規Nodeは活性状態）

---

## 8. LLMとの関係

model/ の型はLLM連携のインターフェースとしても機能する。

- LLMはProjection案を**提案**するのみ（確定は人間）
- LLMはNodeを**自動編集しない**
- LLMはVoice.LLMとして発話者を明示する
- EpistemicStateはLLMの質問強度制御に使用される

---

## 9. Rust移植時の対応方針

`core/` にRust実装を置く際、本モジュールの各型と1:1対応させる。

- TypeScript の union type → Rust の enum
- TypeScript の interface → Rust の struct
- 純粋関数 → Rust の impl / free function
- IDの生成戦略は共通仕様として docs/ に定義する
