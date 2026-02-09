# Kakicom PKM — Claude Code Guide

## プロジェクト概要

思考の断片を無限キャンバス上に配置し、関係・変化・不足を可視化する**認知拡張ツール**。
従来のPKMとは異なり、文章の線形編集ではなく**空間的な思考マッピング**を目的とする。

### 核となる思想

- 思考は最初から整理されていない → 未整理を許容する
- 位置・距離・塊そのものが意味を持つ
- 構造は後から生まれる（先に固定しない）
- LLMは代行者ではなくメタ認知補助

---

## 技術スタック

| 項目 | 技術 |
|------|------|
| 言語 | TypeScript 5.9 (strict mode) |
| ビルド | Vite 7 (rolldown-vite) |
| パッケージマネージャ | pnpm |
| 描画 | Canvas 2D（将来WebGPUに差替可能） |
| 永続化 | IndexedDB (ブラウザローカル) |
| ランタイム | Browser (Chrome / Firefox) |
| UIフレームワーク | なし（意図的に未導入） |
| 依存 | 最小限（effect のみ、将来用に予約） |
| 開発環境 | Nix (flake.nix) + direnv |

---

## コマンド

```bash
# アプリ（app/ ディレクトリ内で実行）
pnpm dev          # 開発サーバー起動 (localhost:5173)
pnpm build        # tsc + vite build（型チェック→本番ビルド）
pnpm preview      # ビルド成果物のプレビュー

# サンドボックスVM（プロジェクトルートで実行）
just up           # Lima VM起動（worktree準備含む）
just shell        # VMシェルに入る
just run <cmd>    # VM内でコマンド実行
just stop         # VM停止
just destroy      # VM+worktree完全削除
```

**テストフレームワーク**: 未導入（MVP段階）
**リンター**: なし（tsconfig strict で代替）

---

## ディレクトリ構造

```
kakicom/
├── app/                    # Webアプリ本体
│   ├── src/
│   │   ├── model/          # 純粋ドメインモデル（依存なし）
│   │   ├── canvas/         # 描画・空間操作（model/に依存）
│   │   └── storage/        # 永続化（model/に依存）
│   ├── package.json
│   └── tsconfig.json
├── core/                   # Rust移植用の予約地（空）
├── docs/                   # ドメインモデル・設計思想
├── specs/                  # 仕様
├── Justfile                # Lima VMタスク
└── lima-sandbox.yaml       # VMサンドボックス設定
```

---

## アーキテクチャ

### レイヤー依存関係（厳守）

```
canvas/  → model/     描画がドメイン型を参照
storage/ → model/     永続化がドメイン型を参照
model/   → (なし)     外部依存なし。プロジェクトの葉ノード

canvas/ ✗ storage/    直接依存禁止
model/  ✗ canvas/     逆方向依存禁止
model/  ✗ storage/    逆方向依存禁止
```

### 各モジュールの責務

**model/** — 純粋ドメインモデル
- 型定義 + 純粋関数のみ
- 副作用なし、ブラウザAPI参照禁止
- Node.jsでも単体テスト可能
- 将来Rustに1:1移植する前提

**canvas/** — 描画・空間操作
- 無限キャンバス描画（Canvas 2D）
- ビューポート管理（パン・ズーム・座標変換）
- ヒットテスト（クリック→Node特定）
- 入力ハンドリング（DOM Events → InputAction）
- ドメインロジックを持たない

**storage/** — 永続化
- IndexedDBでイベントログ・スナップショット保存
- イベントソーシング志向（ThoughtEventが正データ）
- オフラインファースト
- 非同期（Promiseベース）

### コンポーネント構成

```
canvas/
├── viewport/       カメラ制御・座標変換 (World ⇔ Screen)
├── renderer/       Canvas 2D描画パイプライン
├── hit-test/       空間クエリ（点・矩形）
└── input/          DOM入力 → InputAction変換

model/
├── node/           Node, Payload, EpistemicState
├── event/          ThoughtEvent, EventType, Session
├── meta/           Voice, Salience, Dormancy
├── projection/     Projection, Transform, Edge, Annotation
└── view/           View, InteractionMode, Affordance

storage/
├── db/             IndexedDB抽象化（接続・トランザクション・マイグレーション）
├── event-store/    ThoughtEvent永続化・Node/Sessionスナップショット
└── blob-store/     画像バイナリ保存
```

---

## ドメインモデル

### Node（思考の最小単位）

```typescript
// ブランド型ID
type NodeId = string & { readonly __brand: "NodeId" };
type Timestamp = number & { readonly __brand: "Timestamp" };
type BlobId = string & { readonly __brand: "BlobId" };

interface Node {
  readonly id: NodeId;
  readonly payload: Payload;              // TextPayload | ImagePayload | MixedPayload
  readonly kind: NodeKind;                // "note" | "question" | "reference" | "anchor"
  readonly epistemicState: EpistemicState; // 確信度
  readonly createdAt: Timestamp;
}
```

**Nodeが持たないもの**: 階層、フォルダ、タグ、空間位置（すべてProjection/Viewの責務）

### Payload（Nodeの中身）

```typescript
type Payload = TextPayload | ImagePayload | MixedPayload;
// TextPayload:  { type: "text", text }
// ImagePayload: { type: "image", blobId, mime, width, height }
// MixedPayload: { type: "mixed", blobId, mime, width, height, memo }
```

- MixedPayloadが最頻出（スクショ + メモ）
- 画像実データはblob-storeにBlobIdで参照保存

### EpistemicState（確信度）

```
"certain" > "likely" > "hypothesis" > "speculative" > "unsure"
```

- デフォルト: `"unsure"`（確信は後から付与）
- Viewで色・透明度・枠線スタイルに反映

### DormancyState（休眠）

```
"active" → "cooling" → "dormant" → "archived"（逆方向も可）
```

- デフォルト: `"active"`
- 未使用Nodeは自然に薄れる（忘却は第一級概念）

### ThoughtEvent（変化記録）

```typescript
interface ThoughtEvent {
  readonly id: EventId;
  readonly nodeId: NodeId;
  readonly type: EventType;     // 8種: created, edited, moved, linked, ...
  readonly timestamp: Timestamp;
  readonly sessionId: SessionId | null;
  readonly detail: EventDetail; // discriminated union
}
```

- 追記専用・不変（append-only, immutable）
- Nodeは比較的不変、意味はEventに宿る

### Projection（意味変換）

Node集合を別の意味空間へ写像する操作。**Nodeを変更しない**（読み取り専用の写像）。

出力: positions（空間座標）、edges（関係線）、annotations（注釈）

Transform種別: `manual` | `spatial_cluster` | `logical_structure` | `dependency` | `timeline` | `custom`

### View（認知レンズ）

Projection群 + InteractionMode + Affordanceの組み合わせ。
同一Node集合に対して複数のViewで「見方」を変える。

InteractionMode: `free_explore` | `organize` | `explain` | `debug` | `reflect`

---

## 座標系

### World座標とScreen座標

```
World座標: 原点(0,0)=論理中心、無限範囲。Nodeの配置位置。
Screen座標: 原点(0,0)=Canvas左上、CSSピクセル。マウスイベント座標。

World → Screen:
  sx = (wx - camera.x) * zoom + canvas.width / 2
  sy = (wy - camera.y) * zoom + canvas.height / 2

Screen → World:
  wx = (sx - canvas.width / 2) / zoom + camera.x
  wy = (sy - canvas.height / 2) / zoom + camera.y
```

- 座標変換はviewport/に閉じ込める
- zoom範囲: 0.1（広域俯瞰）〜 5.0（詳細表示）
- ズームはマウスカーソル位置を中心に行う

---

## IndexedDB スキーマ

```
Database: "kakicom", Version: 1

ObjectStores:
  events       keyPath: "id"        indexes: node_id, timestamp, session_id
  nodes        keyPath: "node.id"   indexes: created_at
  sessions     keyPath: "id"        indexes: started_at
  blobs        keyPath: "id"        (画像バイナリ)
```

- イベントログが正（Eventを正としてNodeスナップショットを再構築可能）
- structured clone algorithmで保存（JSON変換不要）
- Dateは数値（Unix ms）、Mapは使わずPlain Object

---

## コーディング規約

### ファイル構成パターン

```
component/
├── COMPONENT.md     # 詳細仕様（MODULE.md: モジュール単位の仕様）
├── types.ts         # 型定義
├── index.ts         # 公開API再エクスポート
├── [feature].ts     # 実装
└── [helper].ts      # ユーティリティ
```

### 型システム規約

- **ブランド型**: ID系は必ず `string & { readonly __brand: "XxxId" }` で定義
- **Discriminated Union**: `type` フィールドで判別（Payload, EventDetail, Transform等）
- **readonly**: 全interfaceフィールドに `readonly` を付与（イミュータブル）
- **as const**: 定数配列に `as const` を使用
- **any禁止**: 使用しない
- **null vs undefined**: 意図的に区別（nullは「存在しない」、undefinedは「未指定」）

### 命名規約

- 型: PascalCase (`NodeId`, `ThoughtEvent`)
- 関数: camelCase、用途に応じた接頭辞
  - 生成: `create*` / `generate*`
  - 判定: `is*` / `has*`
  - 変換: `*To*` (worldToScreen)
  - 取得: `get*`
- ファイル: kebab-case (`event-store.ts`, `hit-test/`)
- 型サフィックス: `State`, `Config`, `Handler`, `Record`, `Access`

### TypeScript設定

```json
{
  "target": "ES2022",
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "erasableSyntaxOnly": true,
  "noFallthroughCasesInSwitch": true,
  "verbatimModuleSyntax": true,
  "moduleResolution": "bundler"
}
```

- `import type` を厳格に使用（verbatimModuleSyntax）
- `.ts` 拡張子を import パスに明記

---

## 設計上のガードレール

### やるべきこと

- model/の型を中心に設計する
- 純粋関数を優先する
- 即時モード描画（各フレーム全再描画、前フレーム非依存）
- 入力と描画を分離する
- 宣言的データでレンダラーに指示する

### やってはいけないこと

- canvas/ にドメインロジックを入れる
- Nodeに階層・タグを直接持たせる
- model/ からブラウザAPIを参照する
- MVPでパフォーマンス最適化をする
- ThoughtEventを変更・削除する
- LLMにNodeの自動編集をさせる

---

## MVP実装スコープ

### 実装する

- Node (Text / Image / Mixed)
- 無限キャンバス（パン・ズーム）
- ノードのドラッグ配置
- 画像ペーストによるNode生成
- イベントログ保存・再読込
- 探索View（1種類）

### 実装しない

- LLM連携（インターフェース定義のみ）
- 複数View切替 / 高度なProjection
- サーバー同期・クラウド・マルチユーザー
- パフォーマンス最適化（Node数が少ないため不要）
- テストフレームワーク（将来追加）

---

## 将来の拡張ポイント

- **WebGPU**: renderer.tsのみ差替、viewport/hit-test/inputは無変更
- **Rust移植**: core/にmodel/と1:1対応するRust型を実装
- **LLM連携**: Projection案の生成、注釈・質問の提示（メタ認知レイヤとして）
- **サーバー同期**: EventログをAPIに送信し複数端末間で同期
- **全文検索**: TextPayloadにインデックス構築
- **エクスポート**: JSON Lines + Blob zip形式

---

## 詳細リファレンス

各モジュール・コンポーネントの詳細仕様は以下を参照：

- `docs/domain-model.md` — ドメインモデル思想
- `docs/setup.md` — リポジトリ方針・開発ロード
- `app/src/model/MODULE.md` — model/ 設計仕様
- `app/src/canvas/MODULE.md` — canvas/ 設計仕様
- `app/src/storage/MODULE.md` — storage/ 設計仕様
- `app/src/{module}/{component}/COMPONENT.md` — 各コンポーネント仕様
