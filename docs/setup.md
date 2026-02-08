# Spatial PKM – Repository Setup Guide

このドキュメントは、Spatial PKM の **MVP開発に入るためのリポジトリ作成手順と初期方針** をまとめたものである。
本段階では「思想・ドメインを壊さず、後戻りコストを最小化する」ことを最優先とする。

---

## 1. リポジトリ作成の基本方針

### 1.1 前提

* MVPは **Pure Web App** として構築する
* UI / 描画 / 操作感を最優先する
* Rust / wgpu / Tauri は **将来の拡張点** として予約する
* ドメインモデルはコードより先に文書で固定する

### 1.2 採用技術（MVP時点）

* Language: TypeScript
* Build Tool: Vite
* Rendering: Canvas 2D（将来 WebGPU に差し替え可能）
* Storage: IndexedDB（Eventログ）
* Runtime: Browser (Chrome / Firefox)

---

## 2. リポジトリ作成手順

### 2.1 リポジトリの初期化

1. GitHub / GitLab 等で新規リポジトリを作成

2. リポジトリ名は以下を推奨

   * `spatial-pkm`
   * `cognitive-map`
   * `thinking-space`

3. 初期設定

   * README.md を作成
   * License は MIT or Apache-2.0

---

### 2.2 README.md の最小記述

```text
This project is an experimental spatial PKM focused on cognitive exploration rather than linear note-taking.

The goal is to externalize thinking into a navigable space of nodes, views, and projections.
```

この README は **思想のアンカー** であり、後続の実装判断の拠り所とする。

---

## 3. 推奨ディレクトリ構成（MVP）

```text
spatial-pkm/
├─ docs/                # ドメインモデル・設計思想
│  ├─ domain-model.md
│  ├─ repository-setup.md
│  └─ glossary.md
│
├─ app/                 # Webアプリ本体
│  ├─ index.html
│  ├─ main.ts
│  ├─ canvas/
│  │  ├─ renderer.ts
│  │  ├─ viewport.ts
│  │  └─ hit_test.ts
│  ├─ model/
│  │  ├─ node.ts
│  │  ├─ projection.ts
│  │  └─ view.ts
│  ├─ storage/
│  │  └─ event_store.ts
│  └─ style.css
│
├─ core/                # 将来の Rust ドメイン層（空でOK）
│
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
```

### ディレクトリの意図

* `docs/`

  * コードより先に読むべきもの
  * Domain / Concept / Decision を保存

* `app/model/`

  * Node / Projection / View の **純粋な型定義**
  * UI・描画依存コードを置かない

* `app/canvas/`

  * 描画・座標・ヒットテスト
  * ドメインロジックを持たない

* `core/`

  * 将来 Rust で同一ドメインモデルを実装するための予約地

---

## 4. 初期セットアップ手順（Web）

### 4.1 Vite プロジェクト作成

```bash
npm create vite@latest app -- --template vanilla-ts
cd app
npm install
```

### 4.2 必要最小限の依存

* 初期段階では追加依存は極力入れない
* React / Vue / 状態管理ライブラリは導入しない

理由：

* View / Projection の形が固まる前に UI 抽象を固定しないため

---

## 5. MVP段階での実装スコープ

### 5.1 実装するもの

* Node（Text / Image）
* 無限キャンバス（パン・ズーム）
* ノードのドラッグ配置
* 画像ペーストによる Node 生成
* Eventログ保存 / 再読込
* 探索View（1種類）

### 5.2 実装しないもの

* LLM連携（インターフェースのみ定義）
* 複数View切替
* 高度なProjection
* 同期・共有・クラウド

---

## 6. 技術的ガードレール

### 6.1 やってはいけないこと

* Canvas / WebGPU にドメインロジックを入れる
* Nodeに階層・タグを直接持たせる
* 永続化形式を先に固定する
* MVPでパフォーマンス最適化をする

---

## 7. 将来拡張を見据えた設計メモ

* Canvas renderer は WebGPU に差し替え可能な形で抽象化する
* Eventログは JSON Lines を想定
* `core/` の Rust 型と `app/model/` の TS 型は 1:1 対応を保つ

---

## 8. 次のステップ（開発ロード）

1. 無限キャンバスの座標系・ズーム設計
2. Node の最小描画（矩形 + テキスト）
3. ドラッグ & ヒットテスト
4. Eventログ保存
5. 画像ペースト対応

この順序を崩さないこと。

---

## 9. 最後に

このリポジトリは「完成品」ではなく、
**思考と共に成長する実験空間**である。

初期段階では「美しさ」よりも、
**思考を止めない速度と柔軟性**を最優先する。
