import type {
  HitTarget,
  HitTestableScene,
  HitTestOptions,
  HitTester,
} from "./types.ts";
import type { WorldPoint, WorldRect } from "../viewport/index.ts";
import type { NodeId } from "../../model/node/index.ts";
import { rectContainsPoint, rectContainsRect, rectIntersects, expandRect } from "./rect-utils.ts";

/**
 * HitTesterを生成する。
 * ポイントヒットテストとバウンディングボックス検索を提供する。
 */
export function createHitTester(
  options?: Partial<HitTestOptions>,
): HitTester {
  const defaultOptions: HitTestOptions = {
    margin: 4,
    includeDormant: false,
    includeArchived: false,
    ...options,
  };

  let scene: HitTestableScene = { entries: [] };

  return {
    setScene(s: HitTestableScene): void {
      scene = s;
    },

    hitTestPoint(point: WorldPoint, opts?: Partial<HitTestOptions>): HitTarget {
      const merged = { ...defaultOptions, ...opts };

      // 後ろの要素ほど前面（z-index大）→ 逆順に走査して最初にヒットしたものが最前面
      for (let i = scene.entries.length - 1; i >= 0; i--) {
        const entry = scene.entries[i];
        const expanded = expandRect(entry.bounds, merged.margin);
        if (rectContainsPoint(expanded, point)) {
          return { type: "node", nodeId: entry.nodeId };
        }
      }

      return { type: "background" };
    },

    hitTestRect(
      rect: WorldRect,
      mode: "contains" | "intersects",
      _opts?: Partial<HitTestOptions>,
    ): readonly NodeId[] {
      const results: NodeId[] = [];
      for (const entry of scene.entries) {
        if (mode === "contains") {
          if (rectContainsRect(rect, entry.bounds)) {
            results.push(entry.nodeId);
          }
        } else {
          if (rectIntersects(rect, entry.bounds)) {
            results.push(entry.nodeId);
          }
        }
      }
      return results;
    },

    getBounds(nodeId: NodeId): WorldRect | null {
      const entry = scene.entries.find(e => e.nodeId === nodeId);
      return entry?.bounds ?? null;
    },

    getVisibleNodes(viewportRect: WorldRect): readonly NodeId[] {
      return scene.entries
        .filter(e => rectIntersects(viewportRect, e.bounds))
        .map(e => e.nodeId);
    },
  };
}
