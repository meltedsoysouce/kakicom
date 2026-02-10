import type { WorldRect, WorldPoint } from "../viewport/index.ts";
import type { Node } from "../../model/node/index.ts";
import type { NodeStyle } from "../renderer/index.ts";
import { extractText } from "../../model/node/payload.ts";

/**
 * テキストの描画幅を推定する。Canvas 2D の measureText に依存しない近似値。
 * 日本語文字は fontSize 幅、英数字は fontSize * 0.6 幅と仮定する。
 */
export function estimateTextWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const ch of text) {
    width += ch.charCodeAt(0) > 0x7f ? fontSize : fontSize * 0.6;
  }
  return width;
}

/**
 * Node のPayloadとスタイルからバウンディングボックスを算出する。
 * position は中心座標、bounds は左上起点。
 */
export function computeNodeBounds(
  node: Node,
  position: WorldPoint,
  style: NodeStyle,
): WorldRect {
  const text = extractText(node.payload);
  const textWidth = estimateTextWidth(text, style.fontSize);
  const width = Math.max(style.minWidth, textWidth + style.padding * 2);
  const lineHeight = style.fontSize * 1.4;
  const lines = Math.max(1, Math.ceil(textWidth / (width - style.padding * 2)));
  const height = Math.max(style.minHeight, lines * lineHeight + style.padding * 2);

  return {
    x: position.wx - width / 2,
    y: position.wy - height / 2,
    width,
    height,
  };
}
