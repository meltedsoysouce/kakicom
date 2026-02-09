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
  const db: Database = await openDatabase(config);

  return {
    // ── Node CRUD (MVP implementation) ──

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
        estimatedSizeBytes: 0,
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

    // ── Stubs (not implemented for MVP) ──
    appendEvent() {
      throw new Error("not implemented");
    },
    appendEvents() {
      throw new Error("not implemented");
    },
    queryEvents() {
      throw new Error("not implemented");
    },
    queryEventsPaged() {
      throw new Error("not implemented");
    },
    countEvents() {
      throw new Error("not implemented");
    },
    saveSession() {
      throw new Error("not implemented");
    },
    getAllSessions() {
      throw new Error("not implemented");
    },
    getSession() {
      throw new Error("not implemented");
    },
    batch() {
      throw new Error("not implemented");
    },
  };
}
