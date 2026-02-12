import type { EventStore } from "../event-store/index.ts";
import type { ExportEnvelope } from "./types.ts";

/**
 * EventStoreから全データを読み出し、ExportEnvelopeを生成する。
 */
export async function collectExportData(eventStore: EventStore): Promise<ExportEnvelope> {
  const nodes = await eventStore.getAllNodes();
  const edges = await eventStore.getAllEdges();

  return {
    format: "kakicom-export",
    version: 1,
    exportedAt: Date.now(),
    data: { nodes, edges },
  };
}

/**
 * ExportEnvelopeをJSON文字列にシリアライズする。
 * 可読性のため2スペースインデントで整形する。
 */
export function serializeToJson(envelope: ExportEnvelope): string {
  return JSON.stringify(envelope, null, 2);
}
