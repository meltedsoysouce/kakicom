import type { DatabaseConfig } from "./types.ts";

export const STORE_NAMES = {
  EVENTS: "events",
  NODES: "nodes",
  SESSIONS: "sessions",
  BLOBS: "blobs",
  EDGES: "edges",
} as const;

export const KAKICOM_DB_CONFIG: DatabaseConfig = {
  name: "kakicom",
  version: 2,
  migrations: [
    {
      version: 1,
      migrate(db) {
        // events store (for post-MVP use)
        const events = db.createObjectStore("events", { keyPath: "id" });
        events.createIndex("node_id", "nodeId", { unique: false });
        events.createIndex("timestamp", "timestamp", { unique: false });
        events.createIndex("session_id", "sessionId", { unique: false });

        // nodes store (MVP primary)
        const nodes = db.createObjectStore("nodes", { keyPath: "node.id" });
        nodes.createIndex("created_at", "node.createdAt", { unique: false });

        // sessions store (for post-MVP use)
        db.createObjectStore("sessions", { keyPath: "id" });

        // blobs store (for post-MVP use)
        db.createObjectStore("blobs", { keyPath: "id" });
      },
    },
    {
      version: 2,
      migrate(db) {
        const edges = db.createObjectStore("edges", { keyPath: "id" });
        edges.createIndex("source_node_id", "sourceNodeId", { unique: false });
        edges.createIndex("target_node_id", "targetNodeId", { unique: false });
      },
    },
  ],
};
