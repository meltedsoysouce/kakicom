import type { RenderableNode, RenderScene } from "./types.ts";
import type { Node } from "../../model/node/index.ts";
import type { WorldPoint } from "../viewport/index.ts";
import type { DormancyState } from "../../model/meta/index.ts";
import { extractText } from "../../model/node/payload.ts";

/**
 * model/ のデータからRenderableNodeを構築する。
 * テキスト長に応じた簡易サイズ計算を行う。
 */
export function toRenderableNode(params: {
  node: Node;
  position: WorldPoint;
  dormancyState: DormancyState;
  selected: boolean;
  hovered: boolean;
}): RenderableNode {
  const { node, position, dormancyState, selected, hovered } = params;
  const text = extractText(node.payload);
  const width = Math.max(120, Math.min(300, text.length * 8 + 24));
  const height = Math.max(48, Math.ceil(Math.max(1, text.length) / 20) * 20 + 24);
  return {
    id: node.id,
    payload: node.payload,
    kind: node.kind,
    epistemicState: node.epistemicState,
    dormancyState,
    position,
    size: { width, height },
    selected,
    hovered,
  };
}

/**
 * 空のRenderSceneを生成する。
 */
export function emptyScene(): RenderScene {
  return { nodes: [], edges: [], annotations: [], background: "dot_grid" };
}
