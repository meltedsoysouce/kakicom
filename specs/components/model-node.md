# model/node MVP実装仕様

## 概要

全コンポーネントが依存する最基底のエンティティ層。
`index.ts` のスタブ関数を全て実装する。

## 作成ファイル

```
app/src/model/node/
├── types.ts       # 変更不要
├── factory.ts     # createNode, updateNode, generateNodeId, generateBlobId, now
├── payload.ts     # isTextPayload, hasImage, extractText, extractBlobId
├── epistemic.ts   # epistemicWeight, higherEpistemic
└── index.ts       # factory/payload/epistemic から re-export に書き換え
```

## 実装詳細

### factory.ts

```typescript
import { crypto } from ... // globalThis.crypto.randomUUID()

function generateNodeId(): NodeId {
  return crypto.randomUUID() as NodeId;
}

function generateBlobId(): BlobId {
  return crypto.randomUUID() as BlobId;
}

function now(): Timestamp {
  return Date.now() as Timestamp;
}

function createNode(params): Node {
  return {
    id: generateNodeId(),
    payload: params.payload,
    kind: params.kind ?? "note",
    epistemicState: params.epistemicState ?? "unsure",
    createdAt: now(),
  };
}

function updateNode(node, patch): Node {
  return { ...node, ...patch };
}
```

### payload.ts

```typescript
function isTextPayload(p): p is TextPayload {
  return p.type === "text";
}

function hasImage(p): p is ImagePayload | MixedPayload {
  return p.type === "image" || p.type === "mixed";
}

function extractText(p): string {
  switch (p.type) {
    case "text": return p.text;
    case "mixed": return p.memo;
    case "image": return "";
  }
}

function extractBlobId(p): BlobId | null {
  return p.type === "text" ? null : p.blobId;
}
```

### epistemic.ts

```typescript
const WEIGHTS: Record<EpistemicState, number> = {
  certain: 4, likely: 3, hypothesis: 2, speculative: 1, unsure: 0,
};

function epistemicWeight(state): number {
  return WEIGHTS[state];
}

function higherEpistemic(a, b): EpistemicState {
  return epistemicWeight(a) >= epistemicWeight(b) ? a : b;
}
```

### index.ts の書き換え

`throw new Error("not implemented")` を各ファイルからの re-export に置換:

```typescript
export type { ... } from "./types.ts";
export { createNode, updateNode, generateNodeId, generateBlobId, now } from "./factory.ts";
export { isTextPayload, hasImage, extractText, extractBlobId } from "./payload.ts";
export { epistemicWeight, higherEpistemic, EPISTEMIC_ORDER } from "./epistemic.ts";
```

## テスト基準

- `createNode({ payload: { type: "text", text: "hello" } })` が有効な Node を返す
- `updateNode(node, { payload: ... })` が新しい Node を返し、元の Node が変わらない
- `isTextPayload({ type: "text", text: "" })` が `true` を返す
- `epistemicWeight("certain")` が `4` を返す
- `generateNodeId()` が毎回異なる値を返す
