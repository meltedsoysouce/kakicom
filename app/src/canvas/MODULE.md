# canvas/ — 描画・空間操作層

## 1. 概要

本モジュールはKakicom PKMの**視覚的表現と空間操作**を担当する。
無限キャンバス上にNodeを描画し、ユーザーの空間的操作（パン・ズーム・ドラッグ）を処理する。

ドメインロジックを一切持たず、model/ の型を受け取って「見える形にする」ことだけが責務である。

---

## 2. 責務

- 無限キャンバスの描画（Canvas 2D）
- ビューポート管理（パン・ズームによるカメラ制御）
- ワールド座標 ⇔ スクリーン座標の変換
- Nodeの視覚的レンダリング（矩形・テキスト・画像）
- EpistemicState / DormancyState の視覚的マッピング（色・透明度・強調）
- ヒットテスト（クリック位置に対応するNodeの特定）
- ユーザー操作の受付とイベント発行（ドラッグ・選択・配置）

### 責務に含まれないもの

- Nodeの生成・編集・削除（→ model/ + 上位層）
- イベントの永続化（→ storage/）
- Projectionの算出ロジック（→ 上位層）
- ビジネスルールの判定（→ model/）

---

## 3. 設計原則

1. **ドメインロジックを持たない** — canvas/ はmodel/の型を描画するだけ
2. **座標系を一貫させる** — ワールド座標を正とし、スクリーン座標は表示時に変換
3. **レンダラーを差し替え可能に保つ** — Canvas 2D → WebGPU への移行を妨げない
4. **フレーム単位で完結** — 各フレームの描画は前フレームの状態に依存しない（即時モード描画）
5. **入力と描画を分離する** — 入力処理と描画パスは独立したパイプラインとする

---

## 4. 座標系設計

### 4.1 二つの座標系

本モジュールは2つの座標系を扱う。

#### ワールド座標（World Space）

```
- 原点: (0, 0) = キャンバスの論理的中心
- 単位: 論理ピクセル（ズームレベル1.0のとき1px = 1論理ピクセル）
- 範囲: 無限（制限なし）
- 用途: Nodeの配置位置、Projectionの出力座標
```

Nodeの位置はすべてワールド座標で保持する。
パンやズームが変わってもNodeのワールド座標は不変。

#### スクリーン座標（Screen Space）

```
- 原点: (0, 0) = Canvas要素の左上
- 単位: CSSピクセル（devicePixelRatioを考慮）
- 範囲: Canvas要素のサイズ
- 用途: マウスイベント座標、実際の描画位置
```

ユーザーのマウス操作はスクリーン座標で受け取り、
ワールド座標に変換してからドメイン処理に渡す。

### 4.2 座標変換

```
ワールド座標 → スクリーン座標:
  screen_x = (world_x - camera.x) * camera.zoom + canvas.width / 2
  screen_y = (world_y - camera.y) * camera.zoom + canvas.height / 2

スクリーン座標 → ワールド座標:
  world_x = (screen_x - canvas.width / 2) / camera.zoom + camera.x
  world_y = (screen_y - canvas.height / 2) / camera.zoom + camera.y
```

この変換はViewport内に閉じ込め、他のコンポーネントが直接計算しない。

---

## 5. コンポーネント設計

### 5.1 Viewport — カメラとビューの管理

```
Camera {
  x: number       // ワールド座標でのカメラ中心X
  y: number       // ワールド座標でのカメラ中心Y
  zoom: number    // ズームレベル (1.0 = 等倍)
}
```

**責務:**

- カメラ状態の保持と更新
- パン操作（ドラッグ / キーボード / タッチ）の処理
- ズーム操作（ホイール / ピンチ）の処理
- ワールド ⇔ スクリーン座標変換の提供
- ビューポート矩形（現在見えている領域）の算出

**ズームの制約:**

```
MIN_ZOOM = 0.1    // 最小ズーム（広域俯瞰）
MAX_ZOOM = 5.0    // 最大ズーム（詳細表示）
```

ズームは常にマウスカーソル位置を中心に行う。

### 5.2 Renderer — 描画パイプライン

**責務:**

- Canvas 2D コンテキストの管理
- devicePixelRatio に対応した高解像度描画
- フレームごとの描画ループ制御（requestAnimationFrame）
- Nodeの視覚的描画

**描画順序:**

```
1. 背景（グリッドまたは無地）
2. Edge（Projectionが出力したリンク線）
3. Node本体（矩形 + Payload内容）
4. Annotation（Projectionが出力した注釈）
5. 選択状態・ホバー状態のオーバーレイ
6. UI要素（ミニマップ等、将来）
```

**EpistemicStateの視覚マッピング:**

```
Certain     → 不透明、太枠、高コントラスト
Likely      → やや透明
Hypothesis  → 点線枠
Speculative → 薄い塗り、細枠
Unsure      → 最も薄い、破線枠
```

**DormancyStateの視覚マッピング:**

```
Active   → 通常描画
Cooling  → やや退色
Dormant  → 大幅に退色、縮小
Archived → 非表示（明示的に表示を要求した場合のみ描画）
```

### 5.3 HitTest — 空間クエリ

**責務:**

- スクリーン座標からNodeを特定する
- 矩形選択（ドラッグ範囲内のNode一括選択）
- 最前面判定（重なったNodeのz-order解決）

**アルゴリズム方針:**

MVP段階では全Nodeの線形走査で十分。
Node数が数百を超えた段階で空間インデックス（四分木等）を検討する。

```
hitTest(screen_pos) → NodeId | null

手順:
  1. screen_pos をワールド座標に変換
  2. 全Nodeを逆順（前面→背面）に走査
  3. ワールド座標がNodeの矩形内にあるか判定
  4. 最初にヒットしたNodeのIDを返す
```

---

## 6. 入力処理

### 6.1 操作とアクションの対応

```
操作                 → アクション
─────────────────────────────────────────
背景ドラッグ         → パン（カメラ移動）
Nodeドラッグ         → Node移動（→ ThoughtEvent.Moved を発行）
ホイール             → ズーム（カーソル中心）
クリック（背景）     → 選択解除
クリック（Node）     → Node選択
ダブルクリック       → Node編集モード開始
Ctrl+V / ペースト    → 画像 or テキストからNode生成
```

### 6.2 入力の処理フロー

```
DOM Event (mouse/touch/keyboard)
  → InputHandler（スクリーン座標で受信）
  → Viewport経由でワールド座標に変換
  → HitTestでNode特定
  → アクションをコールバック / イベントとして上位層に通知
```

canvas/ は入力を解釈してアクションに変換するが、
ドメイン操作（Node生成・Event記録）の実行自体は上位層の責務である。

---

## 7. モジュール内のファイル構成（想定）

```
canvas/
├── MODULE.md        # 本ドキュメント
├── viewport.ts      # Camera, 座標変換, パン・ズーム
├── renderer.ts      # Canvas 2D描画、描画ループ、視覚マッピング
├── hit_test.ts      # ヒットテスト、空間クエリ
├── input.ts         # DOM入力イベントの受付とアクション変換
├── types.ts         # canvas/固有の型（Rect, Size, Color等）
└── index.ts         # 公開APIの再エクスポート
```

---

## 8. 依存関係

```
canvas/ → model/  (Node, EpistemicState, DormancyState 等の型を参照)

canvas/ ✗ storage/  (永続化層に直接アクセスしない)
```

canvas/ が model/ に依存する方向は一方通行。
model/ が canvas/ の型を参照することはない。

---

## 9. WebGPU移行への備え

現在はCanvas 2Dで描画するが、将来的にWebGPUへ差し替えることを前提とする。

### 差し替え可能にするための方針

1. **描画命令をRendererに閉じ込める** — viewport.tsやhit_test.tsはCanvas 2D APIを直接呼ばない
2. **描画対象を抽象化する** — Rendererへの入力は「何を・どこに・どう描くか」の宣言的データ
3. **座標変換はRenderer外で完結** — Viewport の座標変換はレンダリングAPI非依存

移行時に変更するのは renderer.ts のみとし、
viewport.ts / hit_test.ts / input.ts は無変更で動作することを目指す。

---

## 10. パフォーマンス方針（MVP段階）

- MVP段階ではパフォーマンス最適化を行わない
- 毎フレーム全Node再描画で問題ない（Node数が少ないため）
- ダーティフラグ、差分描画、空間インデックスは後回し
- 問題が顕在化してから計測し、ボトルネックに対処する
