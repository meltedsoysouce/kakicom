# Kakicom PKM Domain Model

## 1. 目的と基本思想

本PKMは「知的空間のマッピング／探検」を目的とする。
文章中心・線形編集を前提とした従来のPKMではなく、
**思考の断片を空間に配置し、その関係・変化・不足を可視化するための認知拡張ツール**を目指す。

重要な前提は以下：

* 思考は最初から整理されていない
* 位置・距離・塊そのものが意味を持つ
* 構造は後から生まれる
* LLMは代行者ではなく、メタ認知補助である

---

## 2. コアドメイン概念

### 2.1 Node（思考の最小単位）

**Node = 注意が一度引っかかったもの（思考の痕跡）**

* 完成している必要はない
* 未整理・未確定が正常状態
* テキスト／画像を等価に扱う

```text
Node {
  id
  payload
  kind
  epistemic_state
  created_at
}
```

#### Payload

```text
Payload =
  | TextPayload
  | ImagePayload
  | MixedPayload
```

* TextPayload: 生のテキスト断片
* ImagePayload: スクリーンショット・図・写真
* MixedPayload: 画像 + 後付けメモ（最頻出）

#### Nodeが持たないもの

* 階層
* フォルダ
* タグ

これらは View / Projection 側の責務とする。

---

### 2.2 EpistemicState（確信度・未確定性）

Nodeがどの程度「信じられているか」を表す。

```text
EpistemicState =
  | Certain
  | Likely
  | Hypothesis
  | Speculative
  | Unsure
```

* Viewで色・透明度・強調に反映
* LLMの質問強度制御に使用

---

### 2.3 ThoughtEvent（時間・変化）

思考は静的ではなく、変化の履歴に意味が宿る。

```text
ThoughtEvent {
  id
  node_id
  type
  timestamp
  session_id?
}
```

Event例:

* Created
* Edited
* Moved
* Linked
* Questioned

Nodeは比較的不変、意味はEventに宿る。

---

### 2.4 Session（探索のまとまり）

```text
Session {
  id
  purpose?
  started_at
  ended_at?
}
```

* 学習・デバッグ・創作の一区切り
* 後から「思考の流れ」を振り返るための単位

---

## 3. Projection（意味変換）

**Projection = Node集合を別の意味空間へ写像する操作**

```text
Projection {
  id
  input_nodes
  transform
  output
}
```

ProjectionはNodeを変更しない。
解釈・構造・注釈を付与するだけである。

### Projectionの出力例

* positions: 空間座標
* edges: 論理・因果・依存関係
* annotations: 注釈・質問・警告

例：

* 空間クラスタProjection
* 論理構造Projection
* 学習欠落Projection
* 依存関係Projection

LLMはProjection案を**提案**するのみで、確定は人間が行う。

---

## 4. View（認知レンズ）

**View = Projection + Interaction + UIルール**

```text
View {
  id
  projections
  interaction_mode
  affordances
}
```

### InteractionMode

```text
InteractionMode =
  | FreeExplore
  | Organize
  | Explain
  | Debug
  | Reflect
```

Viewは同一Node集合に対する「見方の違い」であり、
用途ごとにアプリを分けない。

### View例

* 探索View：画像・未整理Node中心
* 学習View：前提不足・質問強調
* 創作View：因果・時系列
* デバッグView：依存・仮説検証

---

## 5. Voice（思考主体）

誰の視点・発話かを区別するための概念。

```text
Voice =
  | Self
  | LLM(name)
  | FutureSelf
  | External(source)
```

* LLMの意見と自分の仮説を混同しない
* 理解の所有権を可視化

---

## 6. Salience（注意の強さ）

```text
Salience {
  node_id
  weight
  reason?
}
```

* 最近触った
* 多くリンクされている
* LLMが注目を促した

検索よりも「今どこを見るべきか」を支援する概念。

---

## 7. Dormancy（忘却・休眠）

```text
DormancyState =
  | Active
  | Cooling
  | Dormant
  | Archived
```

* 使われないNodeは自然に薄れる
* 必要になれば再浮上

PKMを脳の代替とするなら、忘却も第一級概念とする。

---

## 8. LLMの位置づけ

LLMは以下のみを行う：

* Projection案の生成
* 注釈・質問の提示
* View切替の提案

行わないこと：

* Nodeの自動編集
* 意味の強制確定
* 無断配置変更

**LLM = メタ認知レイヤ**

---

## 9. 全体構造まとめ

```text
Core
 ├─ Node (payload, epistemic_state)
 ├─ ThoughtEvent (time)
 ├─ Projection (meaning)
 ├─ View (cognition)

Meta
 ├─ Session (process)
 ├─ Voice (who thinks)
 ├─ Salience (attention)
 ├─ Dormancy (forgetting)
```

---

## 10. 指針

* 書くことを邪魔しない
* 未整理を許容する
* 構造は後から生える
* 視点は複数あってよい
* 思考の変化を消さない

このドメインモデルは、
学習・創作・研究・デバッグを横断する「思考のOS」を目指すものである。
