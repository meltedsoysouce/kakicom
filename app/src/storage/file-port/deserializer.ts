import type { EventStore } from "../event-store/index.ts";
import type { ExportEnvelope, ImportResult, ImportStrategy, ValidationResult } from "./types.ts";
import { validateExportData } from "./validator.ts";

/**
 * JSON文字列をパースし、バリデーション済みのExportEnvelopeを返す。
 */
export function parseExportJson(json: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return {
      ok: false,
      errors: [{ path: "(root)", message: "Invalid JSON" }],
    };
  }
  return validateExportData(parsed);
}

/**
 * ExportEnvelopeの内容をEventStoreにインポートする。
 *
 * strategy = "replace": 全クリア → インポート
 * strategy = "merge": 将来実装（Error を throw）
 */
export async function importExportData(
  eventStore: EventStore,
  envelope: ExportEnvelope,
  strategy: ImportStrategy,
): Promise<ImportResult> {
  if (strategy === "merge") {
    throw new Error("merge strategy is not yet implemented");
  }

  await eventStore.clear();

  const { nodes, edges } = envelope.data;

  for (const record of nodes) {
    const snapshot = {
      node: record.node,
      dormancyState: record.dormancyState,
      updatedAt: record.updatedAt,
    };
    await eventStore.saveNode(snapshot, record.position ?? undefined);
  }

  for (const edge of edges) {
    await eventStore.saveEdge({
      id: edge.id,
      sourceNodeId: edge.sourceNodeId,
      targetNodeId: edge.targetNodeId,
      relation: edge.relation,
      label: edge.label,
      createdAt: edge.createdAt,
    });
  }

  return {
    strategy: "replace",
    nodesImported: nodes.length,
    edgesImported: edges.length,
    nodesSkipped: 0,
    edgesSkipped: 0,
  };
}
