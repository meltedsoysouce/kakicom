# canvas/renderer MVP実装仕様

## 概要

Canvas 2D API でNodeと背景を描画する。
Edge / Annotation / EpistemicVisual / DormancyVisual はMVP後。

## 作成ファイル

```
app/src/canvas/renderer/
├── types.ts              # 変更不要
├── renderer.ts           # Renderer 実装（rAFループ、dirty flag）
├── draw-node.ts          # Node描画（矩形 + テキスト）
├── draw-background.ts    # 背景描画（ドットグリッド）
├── theme.ts              # DARK_THEME, LIGHT_THEME
├── scene-builder.ts      # toRenderableNode, emptyScene
└── index.ts              # 各ファイルから re-export
```

## MVP描画パイプライン

```
requestAnimationFrame
  │
  ├─ dirty flag チェック（falseなら何もしない）
  ├─ canvas 全体クリア
  ├─ ctx.save()
  ├─ カメラ変換行列を適用
  │   ctx.translate(cssWidth/2, cssHeight/2)
  │   ctx.scale(zoom, zoom)
  │   ctx.translate(-camera.x, -camera.y)
  ├─ 背景描画（ドットグリッド）
  ├─ Node描画（各ノードをループ）
  │   ├─ 矩形（角丸）描画
  │   ├─ テキスト描画
  │   └─ 選択状態ハイライト
  ├─ ctx.restore()
  └─ dirty = false
```

## 実装詳細

### renderer.ts

```typescript
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

function createRenderer(options?): Renderer {
  const state: RendererState = {
    canvas: null,
    ctx: null,
    scene: emptyScene(),
    viewport: { camera: { x: 0, y: 0, zoom: 1 }, canvasSize: ... },
    theme: options?.theme ?? DARK_THEME,
    dirty: true,
    running: false,
    rafId: null,
  };

  function renderFrame() {
    if (!state.dirty || !state.ctx || !state.canvas) return;
    const { ctx, scene, viewport, theme, canvas } = state;
    const { canvasSize } = viewport;

    // DPR対応
    ctx.setTransform(canvasSize.dpr, 0, 0, canvasSize.dpr, 0, 0);

    // クリア
    ctx.clearRect(0, 0, canvasSize.cssWidth, canvasSize.cssHeight);

    // カメラ変換
    ctx.save();
    ctx.translate(canvasSize.cssWidth / 2, canvasSize.cssHeight / 2);
    ctx.scale(viewport.camera.zoom, viewport.camera.zoom);
    ctx.translate(-viewport.camera.x, -viewport.camera.y);

    // 背景
    drawBackground(ctx, viewport, theme);

    // Node
    for (const node of scene.nodes) {
      drawNode(ctx, node, theme);
    }

    ctx.restore();
    state.dirty = false;
  }

  function loop() {
    if (!state.running) return;
    renderFrame();
    state.rafId = requestAnimationFrame(loop);
  }

  return {
    init(canvas) { ... ctx取得、DPR適用 ... },
    start()      { state.running = true; loop(); },
    stop()       { state.running = false; cancelAnimationFrame(...); },
    requestRedraw() { state.dirty = true; },
    resize(size) { applyCanvasSize(...); state.dirty = true; },
    setScene(scene) { state.scene = scene; state.dirty = true; },
    setViewport(vp) { state.viewport = vp; state.dirty = true; },
    setTheme(theme) { state.theme = theme; state.dirty = true; },
    dispose()    { stop(); state.canvas = null; state.ctx = null; },
  };
}
```

### draw-node.ts

```typescript
function drawNode(ctx: CanvasRenderingContext2D, node: RenderableNode, theme: RenderTheme): void {
  const style = theme.nodeDefaults;
  const { position, size, selected } = node;
  const x = position.wx - size.width / 2;   // 中心座標 → 左上
  const y = position.wy - size.height / 2;

  // 角丸矩形
  ctx.fillStyle = style.fillColor;
  ctx.strokeStyle = selected ? theme.selectionColor : style.strokeColor;
  ctx.lineWidth = selected ? style.strokeWidth * 2 : style.strokeWidth;
  roundRect(ctx, x, y, size.width, size.height, style.cornerRadius);
  ctx.fill();
  ctx.stroke();

  // テキスト描画
  const text = extractTextFromPayload(node.payload);
  if (text) {
    ctx.fillStyle = style.textColor;
    ctx.font = `${style.fontSize}px ${style.fontFamily}`;
    ctx.textBaseline = "top";
    // 簡易ワードラップ or 1行表示（MVP）
    ctx.fillText(text, x + style.padding, y + style.padding, size.width - style.padding * 2);
  }
}
```

### draw-background.ts

```typescript
function drawBackground(ctx, viewport, theme): void {
  // ビューポート可視範囲のドットグリッドを描画
  const visibleRect = getVisibleWorldRect(viewport);
  const gridSize = 40;  // ワールド座標単位のグリッド間隔

  ctx.fillStyle = theme.gridColor;
  ctx.globalAlpha = theme.gridOpacity;

  const startX = Math.floor(visibleRect.x / gridSize) * gridSize;
  const startY = Math.floor(visibleRect.y / gridSize) * gridSize;
  const endX = visibleRect.x + visibleRect.width;
  const endY = visibleRect.y + visibleRect.height;

  const dotSize = 1.5 / viewport.camera.zoom;  // ズームに関わらず一定サイズ

  for (let x = startX; x <= endX; x += gridSize) {
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath();
      ctx.arc(x, y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
}
```

### theme.ts

```typescript
const DARK_THEME: RenderTheme = {
  background: "#1a1a2e",
  gridColor: "#ffffff",
  gridOpacity: 0.15,
  nodeDefaults: {
    fillColor: "#16213e",
    strokeColor: "#0f3460",
    strokeWidth: 1.5,
    cornerRadius: 8,
    fontSize: 14,
    fontFamily: "system-ui, sans-serif",
    textColor: "#e0e0e0",
    padding: 12,
    minWidth: 120,
    minHeight: 48,
  },
  edgeDefaults: { strokeColor: "#0f3460", strokeWidth: 1, arrowSize: 8, labelFontSize: 11, labelColor: "#999" },
  annotationDefaults: { badgeSize: 16, badgeColor: "#e94560", fontSize: 10, fontColor: "#fff" },
  selectionColor: "#53c2f0",
  hoverColor: "#53c2f080",
};

const LIGHT_THEME: RenderTheme = {
  background: "#f5f5f5",
  gridColor: "#000000",
  gridOpacity: 0.1,
  nodeDefaults: {
    fillColor: "#ffffff",
    strokeColor: "#cccccc",
    strokeWidth: 1.5,
    cornerRadius: 8,
    fontSize: 14,
    fontFamily: "system-ui, sans-serif",
    textColor: "#333333",
    padding: 12,
    minWidth: 120,
    minHeight: 48,
  },
  edgeDefaults: { strokeColor: "#999", strokeWidth: 1, arrowSize: 8, labelFontSize: 11, labelColor: "#666" },
  annotationDefaults: { badgeSize: 16, badgeColor: "#e94560", fontSize: 10, fontColor: "#fff" },
  selectionColor: "#2196f3",
  hoverColor: "#2196f380",
};
```

### scene-builder.ts

```typescript
function toRenderableNode(params): RenderableNode {
  const { node, position, dormancyState, selected, hovered } = params;
  const text = extractText(node.payload);
  // テキスト長に応じた簡易サイズ計算
  const width = Math.max(120, Math.min(300, text.length * 8 + 24));
  const height = Math.max(48, Math.ceil(text.length / 20) * 20 + 24);
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

function emptyScene(): RenderScene {
  return { nodes: [], edges: [], annotations: [], background: "dot_grid" };
}
```

## テスト基準

- `createRenderer()` → `init(canvas)` → `start()` でエラーなく動作する
- `setScene` + `requestRedraw` で次フレームに描画される
- Node が矩形＋テキストとして表示される
- 選択状態のNodeに青枠が表示される
