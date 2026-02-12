import type { HitTestableScene, HitTestEdgeEntry } from "./types.ts";
import type { RenderableNode, RenderableEdge } from "../renderer/index.ts";

/**
 * RenderableNode配列とRenderableEdge配列からHitTestableSceneを構築する。
 * 配列順がz-order（後の要素が前面）。
 */
export function buildHitTestableScene(
  nodes: readonly RenderableNode[],
  edges?: readonly RenderableEdge[],
): HitTestableScene {
  const edgeEntries: HitTestEdgeEntry[] = (edges ?? []).map((edge) => ({
    edgeId: edge.id,
    sourceNodeId: edge.sourceNodeId,
    targetNodeId: edge.targetNodeId,
    sourcePosition: edge.sourcePosition,
    targetPosition: edge.targetPosition,
  }));

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
    edges: edgeEntries,
  };
}
