# model/meta MVP実装仕様

## 概要

MVP では **DormancyState = "active" 固定** の最小実装のみ行う。
Voice / Salience は `index.ts` のスタブのまま残す。

## 作成ファイル

```
app/src/model/meta/
├── types.ts       # 変更不要
├── dormancy.ts    # DormancyState関連の最小実装
└── index.ts       # dormancy.ts から re-export + 残りはスタブ維持
```

## MVP実装範囲

### 実装する関数

| 関数 | 実装内容 |
|---|---|
| `initDormancy(nodeId)` | `{ nodeId, state: "active", lastActiveAt: now(), transitionedAt: now() }` |
| `dormancyDepth(state)` | active=0, cooling=1, dormant=2, archived=3 |
| `defaultDormancyPolicy()` | デフォルト値を返す |
| `transitionDormancy(record, newState)` | `{ ...record, state: newState, transitionedAt: now() }` |
| `reactivate(record)` | `transitionDormancy(record, "active")` + `lastActiveAt` 更新 |

### スタブのまま残す関数

| 関数 | 理由 |
|---|---|
| `selfVoice`, `llmVoice`, 他 Voice系 | MVP では Voice 概念を使わない |
| `computeSalience`, 他 Salience系 | MVP では Salience 算出しない |
| `evaluateDormancy` | MVP では自動遷移しない |
| `recencyFactor`, `linkCountFactor`, `epistemicFactor` | Salience系 |

## 実装詳細

### dormancy.ts

```typescript
import type { DormancyState, DormancyRecord, DormancyPolicy } from "./types.ts";
import type { NodeId } from "../node/index.ts";
import { now } from "../node/index.ts";

const DEPTH: Record<DormancyState, number> = {
  active: 0, cooling: 1, dormant: 2, archived: 3,
};

export function dormancyDepth(state: DormancyState): number {
  return DEPTH[state];
}

export function initDormancy(nodeId: NodeId): DormancyRecord {
  const t = now();
  return { nodeId, state: "active", lastActiveAt: t, transitionedAt: t };
}

export function defaultDormancyPolicy(): DormancyPolicy {
  return {
    coolingThresholdMs: 7 * 24 * 60 * 60 * 1000,   // 1週間
    dormantThresholdMs: 30 * 24 * 60 * 60 * 1000,   // 1ヶ月
    autoArchive: false,
    archiveThresholdMs: null,
  };
}

export function transitionDormancy(
  record: DormancyRecord,
  newState: DormancyState,
): DormancyRecord {
  return { ...record, state: newState, transitionedAt: now() };
}

export function reactivate(record: DormancyRecord): DormancyRecord {
  const t = now();
  return { ...record, state: "active", lastActiveAt: t, transitionedAt: t };
}
```

### index.ts の書き換え方針

- `dormancy.ts` からの export を re-export に書き換え
- `DORMANCY_ORDER` はそのまま（既に実値あり）
- Voice / Salience 関連はスタブ（`throw new Error("not implemented")`）のまま維持

## テスト基準

- `initDormancy("x" as NodeId).state === "active"`
- `dormancyDepth("dormant") === 2`
- `reactivate(coolingRecord).state === "active"`
