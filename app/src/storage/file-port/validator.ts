import type { ValidationResult, ValidationError } from "./types.ts";

const VALID_PAYLOAD_TYPES = ["text", "image", "mixed"] as const;
const VALID_NODE_KINDS = ["note", "question", "reference", "anchor"] as const;
const VALID_EPISTEMIC_STATES = ["certain", "likely", "hypothesis", "speculative", "unsure"] as const;
const VALID_DORMANCY_STATES = ["active", "cooling", "dormant", "archived"] as const;
const VALID_EDGE_RELATIONS = [
  "causal", "prerequisite", "similar", "contradicts", "depends_on", "associated", "custom",
] as const;

function hasKeys(obj: unknown, keys: readonly string[]): obj is Record<string, unknown> {
  if (typeof obj !== "object" || obj === null) return false;
  for (const key of keys) {
    if (!(key in obj)) return false;
  }
  return true;
}

function isOneOf(value: unknown, allowed: readonly string[]): boolean {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function validateNode(node: unknown, index: number): readonly ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `data.nodes[${index}]`;

  if (!hasKeys(node, ["node", "dormancyState", "updatedAt"])) {
    errors.push({ path: prefix, message: "missing required fields (node, dormancyState, updatedAt)" });
    return errors;
  }

  const record = node as Record<string, unknown>;

  if (typeof record["updatedAt"] !== "number") {
    errors.push({ path: `${prefix}.updatedAt`, message: "must be a number" });
  }

  if (!isOneOf(record["dormancyState"], VALID_DORMANCY_STATES)) {
    errors.push({ path: `${prefix}.dormancyState`, message: `must be one of: ${VALID_DORMANCY_STATES.join(", ")}` });
  }

  // position: null | { x: number, y: number }
  const position = record["position"];
  if (position !== null && position !== undefined) {
    if (!hasKeys(position, ["x", "y"]) || typeof (position as Record<string, unknown>)["x"] !== "number" || typeof (position as Record<string, unknown>)["y"] !== "number") {
      errors.push({ path: `${prefix}.position`, message: "must be null or { x: number, y: number }" });
    }
  }

  const inner = record["node"];
  if (!hasKeys(inner, ["id", "payload", "kind", "epistemicState", "createdAt"])) {
    errors.push({ path: `${prefix}.node`, message: "missing required fields (id, payload, kind, epistemicState, createdAt)" });
    return errors;
  }

  const n = inner as Record<string, unknown>;

  if (typeof n["id"] !== "string") {
    errors.push({ path: `${prefix}.node.id`, message: "must be a string" });
  }

  if (typeof n["createdAt"] !== "number") {
    errors.push({ path: `${prefix}.node.createdAt`, message: "must be a number" });
  }

  if (!isOneOf(n["kind"], VALID_NODE_KINDS)) {
    errors.push({ path: `${prefix}.node.kind`, message: `must be one of: ${VALID_NODE_KINDS.join(", ")}` });
  }

  if (!isOneOf(n["epistemicState"], VALID_EPISTEMIC_STATES)) {
    errors.push({ path: `${prefix}.node.epistemicState`, message: `must be one of: ${VALID_EPISTEMIC_STATES.join(", ")}` });
  }

  const payload = n["payload"];
  if (!hasKeys(payload, ["type"])) {
    errors.push({ path: `${prefix}.node.payload`, message: "missing type field" });
  } else {
    const p = payload as Record<string, unknown>;
    if (!isOneOf(p["type"], VALID_PAYLOAD_TYPES)) {
      errors.push({ path: `${prefix}.node.payload.type`, message: `must be one of: ${VALID_PAYLOAD_TYPES.join(", ")}` });
    }
  }

  return errors;
}

function validateEdge(edge: unknown, index: number): readonly ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `data.edges[${index}]`;

  if (!hasKeys(edge, ["id", "sourceNodeId", "targetNodeId", "relation", "createdAt"])) {
    errors.push({ path: prefix, message: "missing required fields (id, sourceNodeId, targetNodeId, relation, createdAt)" });
    return errors;
  }

  const e = edge as Record<string, unknown>;

  if (typeof e["id"] !== "string") {
    errors.push({ path: `${prefix}.id`, message: "must be a string" });
  }

  if (typeof e["sourceNodeId"] !== "string") {
    errors.push({ path: `${prefix}.sourceNodeId`, message: "must be a string" });
  }

  if (typeof e["targetNodeId"] !== "string") {
    errors.push({ path: `${prefix}.targetNodeId`, message: "must be a string" });
  }

  if (!isOneOf(e["relation"], VALID_EDGE_RELATIONS)) {
    errors.push({ path: `${prefix}.relation`, message: `must be one of: ${VALID_EDGE_RELATIONS.join(", ")}` });
  }

  if (e["label"] !== null && typeof e["label"] !== "string") {
    errors.push({ path: `${prefix}.label`, message: "must be a string or null" });
  }

  if (typeof e["createdAt"] !== "number") {
    errors.push({ path: `${prefix}.createdAt`, message: "must be a number" });
  }

  return errors;
}

/**
 * パースしたJSONオブジェクトをExportEnvelopeとして検証する。
 * 構造的型チェック（TypeScriptのランタイム検証）。
 */
export function validateExportData(raw: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!hasKeys(raw, ["format", "version", "exportedAt", "data"])) {
    return {
      ok: false,
      errors: [{ path: "(root)", message: "missing required fields (format, version, exportedAt, data)" }],
    };
  }

  const obj = raw as Record<string, unknown>;

  if (obj["format"] !== "kakicom-export") {
    errors.push({ path: "format", message: 'must be "kakicom-export"' });
  }

  if (obj["version"] !== 1) {
    errors.push({ path: "version", message: "must be 1" });
  }

  if (typeof obj["exportedAt"] !== "number" || obj["exportedAt"] <= 0 || !Number.isInteger(obj["exportedAt"])) {
    errors.push({ path: "exportedAt", message: "must be a positive integer" });
  }

  const data = obj["data"];
  if (!hasKeys(data, ["nodes", "edges"])) {
    errors.push({ path: "data", message: "missing required fields (nodes, edges)" });
    return { ok: false, errors };
  }

  const d = data as Record<string, unknown>;

  if (!Array.isArray(d["nodes"])) {
    errors.push({ path: "data.nodes", message: "must be an array" });
  } else {
    for (let i = 0; i < (d["nodes"] as unknown[]).length; i++) {
      errors.push(...validateNode((d["nodes"] as unknown[])[i], i));
    }
  }

  if (!Array.isArray(d["edges"])) {
    errors.push({ path: "data.edges", message: "must be an array" });
  } else {
    for (let i = 0; i < (d["edges"] as unknown[]).length; i++) {
      errors.push(...validateEdge((d["edges"] as unknown[])[i], i));
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data: raw as unknown as import("./types.ts").ExportEnvelope };
}
