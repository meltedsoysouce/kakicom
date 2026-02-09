# model/projection MVP実装仕様

## 概要

ManualTransform のみ実装する。
Nodeの位置情報（Position）の管理と、ProjectionOutputの基本操作を提供する。

## 作成ファイル

```
app/src/model/projection/
├── types.ts       # 変更不要
├── factory.ts     # createProjection, createManualProjection, createEdge, createAnnotation
├── output.ts      # emptyOutput, setPosition, addEdge, addAnnotation, mergeOutputs
├── position.ts    # distance, translate, centroid
└── index.ts       # 各ファイルから re-export
```

## MVP実装範囲

### 実装する関数

| 関数 | 用途 |
|---|---|
| `createProjection` | 汎用Projection生成 |
| `createManualProjection` | ManualTransformのProjection簡易生成 |
| `emptyOutput` | 空のProjectionOutput生成 |
| `setPosition` | Node位置の追加・更新 |
| `addEdge` | **実装するが MVP では呼ばない** |
| `addAnnotation` | **実装するが MVP では呼ばない** |
| `mergeOutputs` | **実装するが MVP では呼ばない** |
| `createEdge` | Edge生成ファクトリ |
| `createAnnotation` | Annotation生成ファクトリ |
| `distance` | 2点間距離 |
| `translate` | 位置移動 |
| `centroid` | 重心計算 |

### 実装不要（スタブ維持なし、全て実装する）

このコンポーネントは全関数がシンプルな純粋関数なので全て実装する。

## 実装詳細

### factory.ts

```typescript
function createProjection(params): Projection {
  return {
    id: crypto.randomUUID() as ProjectionId,
    name: params.name,
    description: params.description ?? "",
    inputNodes: params.inputNodes,
    transform: params.transform,
    output: emptyOutput(),
    createdAt: now(),
  };
}

function createManualProjection(params): Projection {
  return {
    id: crypto.randomUUID() as ProjectionId,
    name: params.name,
    description: "",
    inputNodes: params.inputNodes,
    transform: { type: "manual" },
    output: {
      positions: params.positions,
      edges: [],
      annotations: [],
    },
    createdAt: now(),
  };
}
```

### output.ts

`ReadonlyMap` を使った不変操作:

```typescript
function emptyOutput(): ProjectionOutput {
  return {
    positions: new Map(),
    edges: [],
    annotations: [],
  };
}

function setPosition(output, nodeId, position): ProjectionOutput {
  const newPositions = new Map(output.positions);
  newPositions.set(nodeId, position);
  return { ...output, positions: newPositions };
}

function addEdge(output, edge): ProjectionOutput {
  return { ...output, edges: [...output.edges, edge] };
}

function addAnnotation(output, annotation): ProjectionOutput {
  return { ...output, annotations: [...output.annotations, annotation] };
}

function mergeOutputs(a, b): ProjectionOutput {
  const positions = new Map(a.positions);
  for (const [k, v] of b.positions) {
    positions.set(k, v);  // 後勝ち
  }
  return {
    positions,
    edges: [...a.edges, ...b.edges],
    annotations: [...a.annotations, ...b.annotations],
  };
}
```

### position.ts

```typescript
function distance(a, b): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function translate(pos, dx, dy): Position {
  return { x: pos.x + dx, y: pos.y + dy };
}

function centroid(positions): Position {
  if (positions.length === 0) return { x: 0, y: 0 };
  const sum = positions.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 },
  );
  return { x: sum.x / positions.length, y: sum.y / positions.length };
}
```

## テスト基準

- `createManualProjection` の output.positions が渡した Map と一致する
- `setPosition` → `output.positions.get(nodeId)` で位置が取得できる
- `distance({ x: 0, y: 0 }, { x: 3, y: 4 })` === 5
- `centroid([{ x: 0, y: 0 }, { x: 10, y: 10 }])` === `{ x: 5, y: 5 }`
