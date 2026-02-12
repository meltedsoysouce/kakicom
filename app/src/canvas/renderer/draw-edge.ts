import type { RenderableEdge, RenderTheme } from "./types.ts";

/**
 * RenderableEdgeを矢印付き直線として描画する。
 * 選択時はハイライト表示する。
 */
export function drawEdge(
  ctx: CanvasRenderingContext2D,
  edge: RenderableEdge,
  theme: RenderTheme,
): void {
  const style = theme.edgeDefaults;
  const { sourcePosition: src, targetPosition: tgt, selected } = edge;

  const strokeColor = selected ? theme.selectionColor : style.strokeColor;
  const lineWidth = selected ? style.strokeWidth * 2.5 : style.strokeWidth;

  // 直線描画
  ctx.beginPath();
  ctx.moveTo(src.wx, src.wy);
  ctx.lineTo(tgt.wx, tgt.wy);
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  // 矢印ヘッド（target側）
  const dx = tgt.wx - src.wx;
  const dy = tgt.wy - src.wy;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 0) {
    const angle = Math.atan2(dy, dx);
    const arrowSize = style.arrowSize;

    ctx.beginPath();
    ctx.moveTo(tgt.wx, tgt.wy);
    ctx.lineTo(
      tgt.wx - arrowSize * Math.cos(angle - Math.PI / 6),
      tgt.wy - arrowSize * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      tgt.wx - arrowSize * Math.cos(angle + Math.PI / 6),
      tgt.wy - arrowSize * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fillStyle = strokeColor;
    ctx.fill();
  }

  // ラベル描画（線分中点）
  if (edge.label) {
    const mx = (src.wx + tgt.wx) / 2;
    const my = (src.wy + tgt.wy) / 2;
    ctx.font = `${style.labelFontSize}px system-ui, sans-serif`;
    ctx.fillStyle = style.labelColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(edge.label, mx, my - 4);
    ctx.textAlign = "start";
  }
}
