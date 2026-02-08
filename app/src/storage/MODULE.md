# storage/ — 永続化層

## 1. 概要

本モジュールはKakicom PKMの**データ永続化**を担当する。
ThoughtEventを中心としたイベントログの保存・読み込みを提供し、
アプリケーション状態の復元を可能にする。

ドメインモデルの型定義には依存するが、描画やUI操作には一切関与しない。

---

## 2. 責務

- ThoughtEventの永続保存と読み込み
- Nodeの現在状態の保存と復元
- Sessionの保存と復元
- データのシリアライズ / デシリアライズ
- IndexedDBとのやりとり

### 責務に含まれないもの

- ドメインロジックの判定（→ model/）
- 描画・UI操作（→ canvas/）
- サーバー同期・クラウド保存（MVPスコープ外）
- 検索・全文検索インデックスの構築（将来課題）

---

## 3. 設計原則

1. **イベントソーシング志向** — ThoughtEventの蓄積を正とし、状態は派生データとする
2. **オフラインファースト** — ブラウザローカル（IndexedDB）のみで完結する
3. **model/ の型に従う** — storage/ は独自のデータ構造を発明しない
4. **非同期** — すべてのI/O操作はPromiseベースとする
5. **可搬性を意識する** — 将来のエクスポート / インポート / 移行を妨げない設計

---

## 4. アーキテクチャ

### 4.1 イベントソーシングの概要

```
ThoughtEvent (不変のログ)
  ↓ replay
Current State (Node集合の現在状態)
```

ThoughtEventは追記専用（append-only）の不変ログである。
アプリケーション起動時にイベントを先頭から再生し、
Nodeの現在状態を再構成する。

ただしMVP段階では完全なイベントソーシングは不要。
スナップショット（Nodeの現在状態）も並行して保存し、
起動を高速化する。

### 4.2 データの種類と保存戦略

```
データ種別          保存方式              読み出し
──────────────────────────────────────────────────
ThoughtEvent       追記専用ログ          時系列順 / Node別
Node (snapshot)    最新状態の上書き      全件 / ID指定
Session            追記/更新             全件 / ID指定
Blob (画像等)      バイナリストア        ID指定
```

---

## 5. IndexedDB スキーマ設計

### 5.1 データベース構成

```
Database: "kakicom-pkm"
Version: 1

ObjectStores:
  ├── events       # ThoughtEvent ログ
  ├── nodes        # Node スナップショット（現在状態）
  ├── sessions     # Session
  └── blobs        # 画像等のバイナリデータ
```

### 5.2 events ストア

```
keyPath: "id"
indexes:
  - node_id     (non-unique)  → 特定NodeのEvent履歴取得
  - timestamp   (non-unique)  → 時系列クエリ
  - session_id  (non-unique)  → Session内のEvent一覧
```

レコード例:
```json
{
  "id": "evt_01H...",
  "node_id": "node_01H...",
  "type": "Created",
  "timestamp": 1700000000000,
  "session_id": "sess_01H..."
}
```

### 5.3 nodes ストア

```
keyPath: "id"
indexes:
  - epistemic_state  (non-unique)  → 確信度別フィルタ
  - created_at       (non-unique)  → 作成順ソート
```

レコード例:
```json
{
  "id": "node_01H...",
  "payload": { "type": "text", "text": "思考の断片..." },
  "kind": "note",
  "epistemic_state": "Hypothesis",
  "created_at": 1700000000000
}
```

### 5.4 sessions ストア

```
keyPath: "id"
indexes:
  - started_at  (non-unique)
```

### 5.5 blobs ストア

```
keyPath: "id"
```

画像のバイナリデータ（Blob / ArrayBuffer）を保存する。
ImagePayloadはblob IDを参照し、実データはここに格納する。

---

## 6. EventStore API 設計

### 6.1 コア操作

```typescript
// イベント追記
appendEvent(event: ThoughtEvent): Promise<void>

// 全イベント取得（時系列順）
getAllEvents(): Promise<ThoughtEvent[]>

// 特定Nodeのイベント履歴
getEventsByNode(nodeId: NodeId): Promise<ThoughtEvent[]>

// Session内のイベント一覧
getEventsBySession(sessionId: SessionId): Promise<ThoughtEvent[]>
```

### 6.2 スナップショット操作

```typescript
// Node保存（upsert）
saveNode(node: Node): Promise<void>

// 全Node取得
getAllNodes(): Promise<Node[]>

// Node削除（論理削除ではなくDormancy.Archivedで処理するため原則不使用）
deleteNode(nodeId: NodeId): Promise<void>
```

### 6.3 Session操作

```typescript
// Session開始
startSession(session: Session): Promise<void>

// Session終了
endSession(sessionId: SessionId, endedAt: Timestamp): Promise<void>

// 全Session取得
getAllSessions(): Promise<Session[]>
```

### 6.4 Blob操作

```typescript
// Blob保存
saveBlob(id: string, data: Blob): Promise<void>

// Blob取得
getBlob(id: string): Promise<Blob | null>
```

---

## 7. シリアライズ方針

### 7.1 IndexedDB内部

IndexedDB はstructured clone algorithmに対応しているため、
基本的にJavaScriptオブジェクトをそのまま保存できる。
Blob / ArrayBuffer もネイティブに保存可能。

明示的なJSON変換は不要だが、以下に注意する:

- union type の判別にはtype discriminator フィールドを使う
- Date は数値（Unix ms）として保存する
- Map は使わず Plain Object を使う（structured cloneの互換性）

### 7.2 エクスポート形式（将来）

将来のエクスポート機能では JSON Lines 形式を想定する。

```jsonl
{"type":"event","data":{"id":"evt_01H...","node_id":"node_01H...","type":"Created",...}}
{"type":"event","data":{"id":"evt_02H...","node_id":"node_01H...","type":"Edited",...}}
{"type":"node","data":{"id":"node_01H...","payload":{"type":"text","text":"..."},...}}
```

- 1行1レコード
- ストリーミング読み書き可能
- 画像Blobは別ファイル（zip内同梱等）

---

## 8. モジュール内のファイル構成（想定）

```
storage/
├── MODULE.md          # 本ドキュメント
├── event_store.ts     # EventStore クラス（コアAPI）
├── db.ts              # IndexedDB初期化・マイグレーション
├── serializer.ts      # シリアライズ / デシリアライズ補助
└── index.ts           # 公開APIの再エクスポート
```

---

## 9. 依存関係

```
storage/ → model/  (Node, ThoughtEvent, Session 等の型を参照)

storage/ ✗ canvas/  (描画層に依存しない)
```

storage/ は model/ の型のみに依存する。
canvas/ との間に直接の依存関係はない。

---

## 10. エラーハンドリング方針

### 10.1 IndexedDB のエラー

- 容量超過: ユーザーに通知し、Dormant/Archived Nodeの削除を提案
- スキーマ不整合: マイグレーション処理で対応
- トランザクション失敗: リトライせずエラーを上位に伝搬

### 10.2 データ整合性

- EventとNodeスナップショットの不整合が発生した場合、
  Eventログを正とし、スナップショットを再構築する
- 不正なデータが検出された場合、該当レコードをスキップしてログに記録

---

## 11. マイグレーション方針

IndexedDBのスキーマ変更はonupgradeneededイベントで処理する。

```
Version 1 (MVP):
  events, nodes, sessions, blobs の4ストアを作成

Version N (将来):
  新ストア追加 / インデックス変更をバージョン番号管理で制御
```

マイグレーション処理は db.ts に集約し、
バージョンごとの変更を明示的に記述する。

---

## 12. 将来の拡張ポイント

- **サーバー同期**: EventログをAPIに送信し、複数端末間で同期
- **全文検索**: TextPayloadにインデックスを構築し、Nodeを検索可能にする
- **エクスポート / インポート**: JSON Lines + Blobのzip形式での入出力
- **容量管理**: DormancyState.Archived のNodeとBlobを選択的に削除

これらはすべてMVPスコープ外であり、
現段階ではインターフェースの拡張余地を確保するに留める。
