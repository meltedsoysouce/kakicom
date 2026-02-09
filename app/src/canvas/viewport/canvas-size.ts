import type { CanvasSize } from "./types.ts";

export function measureCanvasSize(canvas: HTMLCanvasElement): CanvasSize {
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  return {
    cssWidth,
    cssHeight,
    dpr,
    physicalWidth: cssWidth * dpr,
    physicalHeight: cssHeight * dpr,
  };
}

export function applyCanvasSize(canvas: HTMLCanvasElement, size: CanvasSize): void {
  canvas.width = size.physicalWidth;
  canvas.height = size.physicalHeight;
}
