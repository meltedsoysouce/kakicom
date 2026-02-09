# canvas/hit-test MVP実装仕様

## 概要

ポイントヒットテスト（クリック座標 → NodeId 特定）を実装する。
矩形選択、Edge判定はMVP後。

## 作成ファイル

```
app/src/canvas/hit-test/
├── types.ts           # 変更不要
├── hit-tester.ts      # HitTester 実装、createHitTester
├── rect-utils.ts      # rectContainsPoint, rectIntersects, expandRect, rectContainsRect
├── bounds.ts          # computeNodeBounds, estimateTextWidth
├── scene-builder.ts   # buildHitTestableScene
└── index.ts           # 各ファイルから re-export
```

## MVP実装範囲

### 実装する関数

| 関数 | 用途 |
|---|---|
| `createHitTester` | HitTester生成 |
| `HitTester.setScene` | シーン設定 |
| `HitTester.hitTestPoint` | クリック→Node特定（**MVPの核**） |
| `HitTester.getBounds` | Node境界取得 |
| `HitTester.getVisibleNodes` | ビューポート内Node一覧 |
| `HitTester.hitTestRect` | 矩形範囲Node検索（簡易実装） |
| `buildHitTestableScene` | RenderableNode→HitTestableScene変換 |
| `computeNodeBounds` | Nodeサイズ算出 |
| `estimateTextWidth` | テキスト幅推定 |
| 矩形ユーティリティ4関数 | 幾何計算 |

## 実装詳細

### hit-tester.ts

```typescript
function createHitTester(options?): HitTester {
  const defaultOptions: HitTestOptions = {
    margin: 4,
    includeDormant: false,
    includeArchived: false,
    ...options,
  };

  let scene: HitTestableScene = { entries: [] };

  return {
    setScene(s) { scene = s; },

    hitTestPoint(point, opts?) {
      const merged = { ...defaultOptions, ...opts };

      // 後ろの要素ほど前面（z-index大）→逆順に走査して最初にヒットしたものが最前面
      for (let i = scene.entries.length - 1; i >= 0; i--) {
        const entry = scene.entries[i];
        const expanded = expandRect(entry.bounds, merged.margin);
        if (rectContainsPoint(expanded, point)) {
          return { type: "node", nodeId: entry.nodeId };
        }
      }

      return { type: "background" };
    },

    hitTestRect(rect, mode, opts?) {
      const results: NodeId[] = [];
      for (const entry of scene.entries) {
        if (mode === "contains") {
          if (rectContainsRect(rect, entry.bounds)) {
            results.push(entry.nodeId);
          }
        } else {
          if (rectIntersects(rect, entry.bounds)) {
            results.push(entry.nodeId);
          }
        }
      }
      return results;
    },

    getBounds(nodeId) {
      const entry = scene.entries.find(e => e.nodeId === nodeId);
      return entry?.bounds ?? null;
    },

    getVisibleNodes(viewportRect) {
      return scene.entries
        .filter(e => rectIntersects(viewportRect, e.bounds))
        .map(e => e.nodeId);
    },
  };
}
```

### rect-utils.ts

```typescript
function rectContainsPoint(rect: WorldRect, point: WorldPoint): boolean {
  return (
    point.wx >= rect.x &&
    point.wx <= rect.x + rect.width &&
    point.wy >= rect.y &&
    point.wy <= rect.y + rect.height
  );
}

function rectContainsRect(outer: WorldRect, inner: WorldRect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

function rectIntersects(a: WorldRect, b: WorldRect): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

function expandRect(rect: WorldRect, margin: number): WorldRect {
  return {
    x: rect.x - margin,
    y: rect.y - margin,
    width: rect.width + margin * 2,
    height: rect.height + margin * 2,
  };
}
```

### bounds.ts

```typescript
function estimateTextWidth(text: string, fontSize: number): number {
  // 日本語文字は fontSize 幅、英数字は fontSize * 0.6 幅と仮定
  let width = 0;
  for (const ch of text) {
    width += ch.charCodeAt(0) > 0x7f ? fontSize : fontSize * 0.6;
  }
  return width;
}

function computeNodeBounds(node, position, style): WorldRect {
  const text = extractText(node.payload);
  const textWidth = estimateTextWidth(text, style.fontSize);
  const width = Math.max(style.minWidth, textWidth + style.padding * 2);
  const lineHeight = style.fontSize * 1.4;
  const lines = Math.max(1, Math.ceil(textWidth / (width - style.padding * 2)));
  const height = Math.max(style.minHeight, lines * lineHeight + style.padding * 2);

  // position は中心座標、bounds は左上起点
  return {
    x: position.wx - width / 2,
    y: position.wy - height / 2,
    width,
    height,
  };
}
```

### scene-builder.ts

```typescript
function buildHitTestableScene(nodes: readonly RenderableNode[]): HitTestableScene {
  return {
    entries: nodes.map((node, i) => ({
      nodeId: node.id,
      bounds: {
        x: node.position.wx - node.size.width / 2,
        y: node.position.wy - node.size.height / 2,
        width: node.size.width,
        height: node.size.height,
      },
      zIndex: i,  // 配列順がz-order
    })),
  };
}
```

## テスト基準

- Node中心クリックで `{ type: "node", nodeId }` が返る
- Node外クリックで `{ type: "background" }` が返る
- 重なったNode で後（前面）のNodeが優先される
- `expandRect` でマージン分だけ矩形が拡張される
- `rectContainsPoint` / `rectIntersects` が正しい結果を返す
