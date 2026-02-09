import type { DormancyState, DormancyRecord, DormancyPolicy } from "./types.ts";
import type { NodeId } from "../node/types.ts";
import { now } from "../node/index.ts";

const DEPTH: Record<DormancyState, number> = {
  active: 0,
  cooling: 1,
  dormant: 2,
  archived: 3,
};

export function dormancyDepth(state: DormancyState): number {
  return DEPTH[state];
}

export function initDormancy(nodeId: NodeId): DormancyRecord {
  const t = now();
  return { nodeId, state: "active", lastActiveAt: t, transitionedAt: t };
}

export function defaultDormancyPolicy(): DormancyPolicy {
  return {
    coolingThresholdMs: 7 * 24 * 60 * 60 * 1000,
    dormantThresholdMs: 30 * 24 * 60 * 60 * 1000,
    autoArchive: false,
    archiveThresholdMs: null,
  };
}

export function transitionDormancy(
  record: DormancyRecord,
  newState: DormancyState,
): DormancyRecord {
  return { ...record, state: newState, transitionedAt: now() };
}

export function reactivate(record: DormancyRecord): DormancyRecord {
  const t = now();
  return { ...record, state: "active", lastActiveAt: t, transitionedAt: t };
}
