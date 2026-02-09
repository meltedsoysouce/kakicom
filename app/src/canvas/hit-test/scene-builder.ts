import type { HitTestableScene } from "./types.ts";
import type { RenderableNode } from "../renderer/index.ts";

/**
 * RenderableNode配列からHitTestableSceneを構築する。
 * 配列順がz-order（後の要素が前面）。
 */
export function buildHitTestableScene(
  nodes: readonly RenderableNode[],
): HitTestableScene {
  return {
    entries: nodes.map((node, i) => ({
      nodeId: node.id,
      bounds: {
        x: node.position.wx - node.size.width / 2,
        y: node.position.wy - node.size.height / 2,
        width: node.size.width,
        height: node.size.height,
      },
      zIndex: i,
    })),
  };
}
