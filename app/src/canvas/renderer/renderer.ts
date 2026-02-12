import type {
  RenderScene,
  RenderTheme,
  Renderer,
} from "./types.ts";
import type { ViewportState, CanvasSize } from "../viewport/index.ts";
import { applyCanvasSize } from "../viewport/canvas-size.ts";
import { drawBackground } from "./draw-background.ts";
import { drawEdge } from "./draw-edge.ts";
import { drawNode } from "./draw-node.ts";
import { emptyScene } from "./scene-builder.ts";
import { DARK_THEME } from "./theme.ts";

interface RendererState {
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
  scene: RenderScene;
  viewport: ViewportState;
  theme: RenderTheme;
  dirty: boolean;
  running: boolean;
  rafId: number | null;
}

/**
 * Canvas 2D Rendererを生成する。
 * requestAnimationFrame ループとdirty flagで効率的に描画する。
 */
export function createRenderer(options?: {
  theme?: RenderTheme;
}): Renderer {
  const state: RendererState = {
    canvas: null,
    ctx: null,
    scene: emptyScene(),
    viewport: {
      camera: { x: 0, y: 0, zoom: 1 },
      canvasSize: { cssWidth: 0, cssHeight: 0, dpr: 1, physicalWidth: 0, physicalHeight: 0 },
    },
    theme: options?.theme ?? DARK_THEME,
    dirty: true,
    running: false,
    rafId: null,
  };

  function renderFrame(): void {
    if (!state.dirty || !state.ctx || !state.canvas) return;
    const { ctx, scene, viewport, theme, canvas } = state;
    const { canvasSize } = viewport;

    // DPR対応: 物理ピクセルに合わせたトランスフォーム
    ctx.setTransform(canvasSize.dpr, 0, 0, canvasSize.dpr, 0, 0);

    // 背景色でクリア
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, canvas.width / canvasSize.dpr, canvas.height / canvasSize.dpr);

    // カメラ変換
    ctx.save();
    ctx.translate(canvasSize.cssWidth / 2, canvasSize.cssHeight / 2);
    ctx.scale(viewport.camera.zoom, viewport.camera.zoom);
    ctx.translate(-viewport.camera.x, -viewport.camera.y);

    // 背景描画（ドットグリッド）
    drawBackground(ctx, viewport, theme);

    // Edge描画（Nodeの下に描画）
    for (const edge of scene.edges) {
      drawEdge(ctx, edge, theme);
    }

    // Node描画
    for (const node of scene.nodes) {
      drawNode(ctx, node, theme);
    }

    ctx.restore();
    state.dirty = false;
  }

  function loop(): void {
    if (!state.running) return;
    renderFrame();
    state.rafId = requestAnimationFrame(loop);
  }

  return {
    init(canvas: HTMLCanvasElement): void {
      state.canvas = canvas;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to get 2d context");
      state.ctx = ctx;
    },

    start(): void {
      state.running = true;
      state.dirty = true;
      loop();
    },

    stop(): void {
      state.running = false;
      if (state.rafId !== null) {
        cancelAnimationFrame(state.rafId);
        state.rafId = null;
      }
    },

    requestRedraw(): void {
      state.dirty = true;
    },

    resize(size: CanvasSize): void {
      if (state.canvas) {
        applyCanvasSize(state.canvas, size);
      }
      state.viewport = {
        ...state.viewport,
        canvasSize: size,
      };
      state.dirty = true;
    },

    setScene(scene: RenderScene): void {
      state.scene = scene;
      state.dirty = true;
    },

    setViewport(vp: ViewportState): void {
      state.viewport = vp;
      state.dirty = true;
    },

    setTheme(theme: RenderTheme): void {
      state.theme = theme;
      state.dirty = true;
    },

    dispose(): void {
      state.running = false;
      if (state.rafId !== null) {
        cancelAnimationFrame(state.rafId);
        state.rafId = null;
      }
      state.canvas = null;
      state.ctx = null;
    },
  };
}
