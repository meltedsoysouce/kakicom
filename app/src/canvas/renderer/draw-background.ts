import type { ViewportState } from "../viewport/index.ts";
import type { RenderTheme } from "./types.ts";
import { getVisibleWorldRect } from "../viewport/query.ts";

const GRID_SIZE = 40;

/**
 * ビューポート可視範囲のドットグリッド背景を描画する。
 */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  viewport: ViewportState,
  theme: RenderTheme,
): void {
  const visibleRect = getVisibleWorldRect(viewport);

  ctx.fillStyle = theme.gridColor;
  ctx.globalAlpha = theme.gridOpacity;

  const startX = Math.floor(visibleRect.x / GRID_SIZE) * GRID_SIZE;
  const startY = Math.floor(visibleRect.y / GRID_SIZE) * GRID_SIZE;
  const endX = visibleRect.x + visibleRect.width;
  const endY = visibleRect.y + visibleRect.height;

  // ズームに関わらず一定の視覚サイズになるドット
  const dotSize = 1.5 / viewport.camera.zoom;

  for (let x = startX; x <= endX; x += GRID_SIZE) {
    for (let y = startY; y <= endY; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.arc(x, y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
}
