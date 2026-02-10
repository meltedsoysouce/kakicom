import type { RenderableNode, RenderTheme } from "./types.ts";
import { extractText } from "../../model/node/payload.ts";

/**
 * 角丸矩形パスを描画する。
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * RenderableNodeを矩形＋テキストとして描画する。
 * 選択状態のNodeにはハイライト枠を表示する。
 */
export function drawNode(
  ctx: CanvasRenderingContext2D,
  node: RenderableNode,
  theme: RenderTheme,
): void {
  const style = theme.nodeDefaults;
  const { position, size, selected } = node;
  // position は中心座標 → 左上座標に変換
  const x = position.wx - size.width / 2;
  const y = position.wy - size.height / 2;

  // 角丸矩形
  ctx.fillStyle = style.fillColor;
  ctx.strokeStyle = selected ? theme.selectionColor : style.strokeColor;
  ctx.lineWidth = selected ? style.strokeWidth * 2 : style.strokeWidth;
  roundRect(ctx, x, y, size.width, size.height, style.cornerRadius);
  ctx.fill();
  ctx.stroke();

  // テキスト描画
  const text = extractText(node.payload);
  if (text) {
    ctx.fillStyle = style.textColor;
    ctx.font = `${style.fontSize}px ${style.fontFamily}`;
    ctx.textBaseline = "top";
    // MVP: 1行表示、maxWidth でクリッピング
    ctx.fillText(
      text,
      x + style.padding,
      y + style.padding,
      size.width - style.padding * 2,
    );
  }
}
