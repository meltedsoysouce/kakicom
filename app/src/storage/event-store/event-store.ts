import { openDatabase, KAKICOM_DB_CONFIG, STORE_NAMES } from "../db/index.ts";
import type { Database } from "../db/index.ts";
import type { NodeSnapshot, PersistedNodeRecord, PersistedEdgeRecord, EventStore } from "./types.ts";
import type { Position } from "../../model/projection/index.ts";
import type { NodeId } from "../../model/node/index.ts";
import type { EdgeId, Edge } from "../../model/edge/index.ts";

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

    async saveNode(snapshot: NodeSnapshot, position?: Position): Promise<void> {
      const record: PersistedNodeRecord = {
        node: snapshot.node,
        dormancyState: snapshot.dormancyState,
        updatedAt: snapshot.updatedAt,
        position: position ?? null,
      };
      const tx = db.transaction([STORE_NAMES.NODES], "readwrite");
      const store = tx.store<PersistedNodeRecord>(STORE_NAMES.NODES);
      await store.put(record);
      await tx.done();
    },

    async getAllNodes(): Promise<readonly PersistedNodeRecord[]> {
      const tx = db.transaction([STORE_NAMES.NODES], "readonly");
      const store = tx.store<PersistedNodeRecord>(STORE_NAMES.NODES);
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

    // ── Edge CRUD ──

    async saveEdge(edge: Edge): Promise<void> {
      const record: PersistedEdgeRecord = {
        id: edge.id,
        sourceNodeId: edge.sourceNodeId,
        targetNodeId: edge.targetNodeId,
        relation: edge.relation,
        label: edge.label,
        createdAt: edge.createdAt,
      };
      const tx = db.transaction([STORE_NAMES.EDGES], "readwrite");
      const store = tx.store<PersistedEdgeRecord>(STORE_NAMES.EDGES);
      await store.put(record);
      await tx.done();
    },

    async getAllEdges(): Promise<readonly PersistedEdgeRecord[]> {
      const tx = db.transaction([STORE_NAMES.EDGES], "readonly");
      const store = tx.store<PersistedEdgeRecord>(STORE_NAMES.EDGES);
      return await store.getAll();
    },

    async deleteEdge(edgeId: EdgeId): Promise<void> {
      const tx = db.transaction([STORE_NAMES.EDGES], "readwrite");
      const store = tx.store<PersistedEdgeRecord>(STORE_NAMES.EDGES);
      await store.delete(edgeId);
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
        STORE_NAMES.EDGES,
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
