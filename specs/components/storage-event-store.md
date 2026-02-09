# storage/event-store MVP実装仕様

## 概要

MVP では **NodeSnapshot の CRUD のみ** 実装する。
ThoughtEvent の追記・クエリ、Session管理、リプレイはスキップ。

## 作成ファイル

```
app/src/storage/event-store/
├── types.ts          # 変更不要
├── event-store.ts    # EventStore 実装（Node CRUD のみ）
└── index.ts          # event-store.ts から re-export
```

## MVP実装範囲

### 実装する関数

| 関数 | 実装内容 |
|---|---|
| `createEventStore(options?)` | DB接続 → EventStore オブジェクト返却 |
| `EventStore.saveNode(snapshot)` | nodes ストアに upsert |
| `EventStore.getAllNodes()` | nodes ストアから全件取得 |
| `EventStore.getNode(nodeId)` | nodes ストアからキー取得 |
| `EventStore.deleteNode(nodeId)` | nodes ストアから削除 |
| `EventStore.clear()` | 全ストアをクリア |
| `EventStore.getStats()` | count のみの簡易実装 |

### スタブのまま残す関数

| 関数 | 理由 |
|---|---|
| `appendEvent` / `appendEvents` | MVPではイベントソーシングしない |
| `queryEvents` / `queryEventsPaged` / `countEvents` | 同上 |
| `saveSession` / `getAllSessions` / `getSession` | MVPではSession管理しない |
| `batch` | MVPでは単一操作で十分 |
| `replayEvents` / `replayNodeAt` | MVPではリプレイ不要 |

## 実装詳細

### event-store.ts

```typescript
import { openDatabase, KAKICOM_DB_CONFIG, STORE_NAMES } from "../db/index.ts";
import type { Database } from "../db/index.ts";
import type { NodeSnapshot, EventStore } from "./types.ts";
import type { NodeId } from "../../model/node/index.ts";

export async function createEventStore(options?: {
  dbName?: string;
}): Promise<EventStore> {
  const config = {
    ...KAKICOM_DB_CONFIG,
    name: options?.dbName ?? KAKICOM_DB_CONFIG.name,
  };
  const db = await openDatabase(config);

  return {
    // ── Node CRUD（MVP実装） ──

    async saveNode(snapshot: NodeSnapshot): Promise<void> {
      const tx = db.transaction([STORE_NAMES.NODES], "readwrite");
      const store = tx.store<NodeSnapshot>(STORE_NAMES.NODES);
      await store.put(snapshot);
      await tx.done();
    },

    async getAllNodes(): Promise<readonly NodeSnapshot[]> {
      const tx = db.transaction([STORE_NAMES.NODES], "readonly");
      const store = tx.store<NodeSnapshot>(STORE_NAMES.NODES);
      return await store.getAll();
    },

    async getNode(nodeId: NodeId): Promise<NodeSnapshot | null> {
      const tx = db.transaction([STORE_NAMES.NODES], "readonly");
      const store = tx.store<NodeSnapshot>(STORE_NAMES.NODES);
      const result = await store.get(nodeId);
      return result ?? null;
    },

    async deleteNode(nodeId: NodeId): Promise<void> {
      const tx = db.transaction([STORE_NAMES.NODES], "readwrite");
      const store = tx.store<NodeSnapshot>(STORE_NAMES.NODES);
      await store.delete(nodeId);
      await tx.done();
    },

    async getStats() {
      const tx = db.transaction(
        [STORE_NAMES.EVENTS, STORE_NAMES.NODES, STORE_NAMES.SESSIONS],
        "readonly",
      );
      return {
        eventCount: await tx.store(STORE_NAMES.EVENTS).count(),
        nodeCount: await tx.store(STORE_NAMES.NODES).count(),
        sessionCount: await tx.store(STORE_NAMES.SESSIONS).count(),
        estimatedSizeBytes: 0,  // MVP: 未実装
      };
    },

    async clear(): Promise<void> {
      const storeNames = [
        STORE_NAMES.EVENTS,
        STORE_NAMES.NODES,
        STORE_NAMES.SESSIONS,
        STORE_NAMES.BLOBS,
      ];
      const tx = db.transaction(storeNames, "readwrite");
      for (const name of storeNames) {
        await tx.store(name).clear();
      }
      await tx.done();
    },

    // ── 以下はスタブ ──
    appendEvent()      { throw new Error("not implemented"); },
    appendEvents()     { throw new Error("not implemented"); },
    queryEvents()      { throw new Error("not implemented"); },
    queryEventsPaged() { throw new Error("not implemented"); },
    countEvents()      { throw new Error("not implemented"); },
    saveSession()      { throw new Error("not implemented"); },
    getAllSessions()    { throw new Error("not implemented"); },
    getSession()       { throw new Error("not implemented"); },
    batch()            { throw new Error("not implemented"); },
  };
}
```

## NodeSnapshot の IndexedDB 保存形式

`keyPath: "node.id"` で保存される。検索例:

```typescript
// 全ノード取得
const snapshots = await eventStore.getAllNodes();

// 各snapshotの構造:
// {
//   node: { id: "xxx", payload: { type: "text", text: "hello" }, ... },
//   dormancyState: "active",
//   updatedAt: 1234567890
// }
```

## テスト基準

- `saveNode` → `getNode` でデータが往復する
- `getAllNodes` で保存した全Nodeが返る
- `deleteNode` 後に `getNode` が `null` を返す
- `clear` 後に `getAllNodes` が空配列を返す
- ブラウザリロード後も `getAllNodes` でデータが返る
