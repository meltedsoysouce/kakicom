# MVP 仕様概要

## 1. MVPゴール

Kakicom PKM の最小動作プロトタイプを構築する。

**ユーザーができること:**

1. キャンバス上のダブルクリックで **Nodeを新規作成** する
2. Nodeをクリックして **テキストを入力・編集** する
3. Nodeを **ドラッグ＆ドロップで移動** する
4. キャンバスを **パン（ドラッグスクロール）** する
5. **ホイールでズーム** する
6. ブラウザをリロードしても **Nodeが永続化** されている

**MVPに含まれないもの:**

- 画像ペースト / MixedPayload
- Edge（関係線）の描画・操作
- Annotation（注釈）の描画
- EpistemicState の変更UI
- DormancyState の自動遷移
- Voice / Salience の算出
- Session / ThoughtEvent の記録（イベントソーシング）
- InteractionMode の切替
- 複数View / Projection

---

## 2. 実装対象コンポーネント

全12コンポーネント中 **9つ** をMVP範囲で実装する。

| コンポーネント | MVP実装範囲 | スキップ |
|---|---|---|
| model/node | 全関数を実装 | — |
| model/meta | Active固定の最小実装 | Salience, Voice |
| model/projection | ManualTransformのみ | 他Transform, Edge, Annotation |
| canvas/viewport | 全関数を実装 | — |
| canvas/renderer | Node描画 + 背景のみ | Edge描画, Annotation描画 |
| canvas/hit-test | ポイントヒットテストのみ | 矩形選択, Edge判定 |
| canvas/input | マウスドラッグ + ダブルクリック | タッチ, キーボード, ペースト |
| storage/db | 全関数を実装 | — |
| storage/event-store | saveNode / getAllNodes のみ | Event追記, Session, リプレイ |

**完全にスキップ:**

| コンポーネント | 理由 |
|---|---|
| model/event | MVP段階ではスナップショット直接保存で代替 |
| model/view | free_explore固定、全Affordance許可で済む |
| storage/blob-store | テキストNodeのみなので画像保存不要 |

---

## 3. 技術スタック

- **言語:** TypeScript (strict mode, ES2022)
- **ビルド:** Vite
- **描画:** Canvas 2D API
- **永続化:** IndexedDB（ブラウザ組込）
- **フレームワーク:** なし（Vanilla TS）

---

## 4. ファイル構成の方針

各コンポーネントのディレクトリには既に以下が存在する:

```
component/
├── COMPONENT.md   # 設計仕様（参照用、変更不要）
├── types.ts       # 公開データ構造（定義済み）
└── index.ts       # 公開インターフェース（スタブ状態）
```

MVP実装で追加するファイル:

```
component/
├── COMPONENT.md
├── types.ts       # 変更不要（必要なら型を追加してよい）
├── index.ts       # throw "not implemented" を実装コードに置換
└── *.ts           # 内部実装ファイル（COMPONENT.md のファイル構成に従う）
```

**原則:**
- `types.ts` は既存の型定義を壊さない
- `index.ts` のスタブ関数を実装に置き換える
- 内部実装ファイルは `index.ts` からのみ re-export する

---

## 5. 成功基準

以下を全て満たすこと:

1. `npx tsc --noEmit` がエラーなしで通る
2. `npx vite build` が成功する
3. ブラウザで `npx vite` → localhost を開くとキャンバスが表示される
4. ダブルクリックでNodeが作成される
5. Nodeにテキストが入力できる
6. Nodeをドラッグ移動できる
7. パン・ズームが動作する
8. リロード後もNodeが残っている

---

## 6. 関連ドキュメント

- [実装順序](./implementation-order.md)
- [コンポーネント別仕様](./components/)
- [アプリ統合仕様](./integration/app-entry.md)
