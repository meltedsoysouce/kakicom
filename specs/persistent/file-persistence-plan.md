# 外部ファイル永続化（Export/Import）実装計画

## Context

現状のkakicomはIndexedDBのみをストレージとして使用している。IndexedDBはブラウザローカルに閉じるため、以下の課題がある:

- ブラウザのストレージ消去でデータ喪失
- デバイス間でデータ移動不可
- バックアップ手段がない
- データのポータビリティがない

これを解決するために、**ファイルへのエクスポート/インポート機能**を導入する。

### 既存コードの準備状況

| 要素 | ファイル | 備考 |
|------|---------|------|
| `PersistedNodeRecord` | `storage/event-store/types.ts` L58-63 | Node + position + dormancy |
| `PersistedEdgeRecord` | `storage/event-store/types.ts` L69-76 | Edge永続化レコード |
| `EventStore.getAllNodes()` | `storage/event-store/event-store.ts` L33-37 | 全Node一括取得 |
| `EventStore.getAllEdges()` | `storage/event-store/event-store.ts` L70-74 | 全Edge一括取得 |
| `EventStore.saveNode()` | `storage/event-store/event-store.ts` L20-31 | Node upsert |
| `EventStore.saveEdge()` | `storage/event-store/event-store.ts` L55-68 | Edge upsert |
| `EventStore.clear()` | `storage/event-store/event-store.ts` L96-109 | 全データクリア |
| `App.start()` / `App.resize()` | `app.ts` L45-48 | 現在の公開API |
| `handleAction` (key) | `app.ts` L382-401 | キーボードハンドリング |

### 設計判断

- **ファイル形式**: JSON（`.kakicom.json` 拡張子）。人間が読める、デバッグ容易、MVPとして十分
- **エクスポート対象**: `PersistedNodeRecord[]` + `PersistedEdgeRecord[]`（現在IndexedDBに保存されているもの全て）
- **画像（Blob）**: MVP段階ではblob-store未実装のため対象外。将来フェーズでZIPアーカイブとして対応
- **インポート戦略**: MVP は `replace`（全置換）のみ。`merge`（差分統合）は将来対応
- **ファイルAPI**: File System Access API（Chrome対応）+ フォールバック（全ブラウザ対応）
- **モジュール配置**: `storage/file-port/` に新設（storageレイヤーの責務）
- **AppState再構築**: インポート後はページリロードで再構築（MVP段階の簡素なアプローチ）

---

## Phase 1: Storage — エクスポートフォーマット型定義

**目的**: `storage/file-port/` モジュールを新設し、エクスポートファイルのフォーマット型とバリデーション関数を定義する。

**作成ファイル**:
- `app/src/storage/file-port/types.ts`
- `app/src/storage/file-port/validator.ts`
- `app/src/storage/file-port/index.ts`

### 型定義 (`types.ts`)

```typescript
import type { PersistedNodeRecord, PersistedEdgeRecord } from "../event-store/index.ts";

/**
 * エクスポートファイルのルート構造。
 * バージョン管理により将来のフォーマット変更に対応する。
 */
export interface ExportEnvelope {
  /** フォーマット識別子。固定値 "kakicom-export" */
  readonly format: "kakicom-export";
  /** フォーマットバージョン。現在は 1 */
  readonly version: 1;
  /** エクスポート日時（Unix ms） */
  readonly exportedAt: number;
  /** エクスポートデータ本体 */
  readonly data: ExportData;
}

/**
 * エクスポートされるデータ本体。
 * IndexedDBの全ストアの内容を平坦に保持する。
 */
export interface ExportData {
  readonly nodes: readonly PersistedNodeRecord[];
  readonly edges: readonly PersistedEdgeRecord[];
}

/**
 * インポート戦略。
 * - replace: 既存データを全削除してからインポート
 * - merge: 既存データを保持し、ID重複時はスキップ（将来実装）
 */
export type ImportStrategy = "replace" | "merge";

/**
 * インポート結果のサマリー。
 */
export interface ImportResult {
  readonly strategy: ImportStrategy;
  readonly nodesImported: number;
  readonly edgesImported: number;
  readonly nodesSkipped: number;
  readonly edgesSkipped: number;
}

/**
 * バリデーションエラー。
 */
export interface ValidationError {
  readonly path: string;
  readonly message: string;
}

/**
 * バリデーション結果。
 */
export type ValidationResult =
  | { readonly ok: true; readonly data: ExportEnvelope }
  | { readonly ok: false; readonly errors: readonly ValidationError[] };
```

### バリデーション (`validator.ts`)

```typescript
/**
 * パースしたJSONオブジェクトをExportEnvelopeとして検証する。
 * 構造的型チェック（TypeScriptのランタイム検証）。
 *
 * チェック項目:
 *   1. format === "kakicom-export"
 *   2. version === 1
 *   3. exportedAt が正の整数
 *   4. data.nodes が配列
 *   5. 各nodeが PersistedNodeRecord の構造を持つ
 *      - node.id: string
 *      - node.payload.type: "text" | "image" | "mixed"
 *      - node.kind: "note" | "question" | "reference" | "anchor"
 *      - node.epistemicState: 5値のいずれか
 *      - node.createdAt: number
 *      - dormancyState: 4値のいずれか
 *      - updatedAt: number
 *      - position: null | { x: number, y: number }
 *   6. data.edges が配列
 *   7. 各edgeが PersistedEdgeRecord の構造を持つ
 *      - id: string
 *      - sourceNodeId: string
 *      - targetNodeId: string
 *      - relation: EdgeRelation の7値のいずれか
 *      - label: string | null
 *      - createdAt: number
 */
export function validateExportData(raw: unknown): ValidationResult

/**
 * 内部ヘルパー: オブジェクトが特定のキーを持つか検証。
 */
function hasKeys(obj: unknown, keys: readonly string[]): obj is Record<string, unknown>
```

### index.ts

```typescript
export type {
  ExportEnvelope,
  ExportData,
  ImportStrategy,
  ImportResult,
  ValidationError,
  ValidationResult,
} from "./types.ts";

export { validateExportData } from "./validator.ts";
```

### 参照すべき既存パターン

| パターン | 参照ファイル |
|----------|-------------|
| PersistedNodeRecord 構造 | `storage/event-store/types.ts` L58-63 |
| PersistedEdgeRecord 構造 | `storage/event-store/types.ts` L69-76 |
| Node型（Payload, Kind, EpistemicState） | `model/node/types.ts` L26-91 |
| Edge型（EdgeRelation） | `model/edge/types.ts`, `model/projection/types.ts` L107-114 |
| DormancyState | `model/meta/types.ts` L121 |
| index.ts再エクスポート | `storage/event-store/index.ts` |

### 注意事項

- `storage/` レイヤーは `model/` に依存可能。`model/` の型を import type で参照する
- `import type` を使用（`verbatimModuleSyntax`）
- `.ts` 拡張子を import パスに明記
- 全フィールド `readonly`
- バリデーションは防御的に行う（外部ファイル入力のため信頼しない）
- `any` 禁止。`unknown` から型を絞り込む

---

## Phase 2: Storage — シリアライズ/デシリアライズ

**目的**: EventStoreからデータを収集してExportEnvelopeを生成する関数と、ExportEnvelopeをEventStoreにインポートする関数を実装する。

**作成ファイル**:
- `app/src/storage/file-port/serializer.ts`
- `app/src/storage/file-port/deserializer.ts`

**変更ファイル**:
- `app/src/storage/file-port/index.ts` — 再エクスポート追加

### シリアライザ (`serializer.ts`)

```typescript
import type { EventStore } from "../event-store/index.ts";
import type { ExportEnvelope } from "./types.ts";

/**
 * EventStoreから全データを読み出し、ExportEnvelopeを生成する。
 *
 * 手順:
 *   1. eventStore.getAllNodes() で全PersistedNodeRecordを取得
 *   2. eventStore.getAllEdges() で全PersistedEdgeRecordを取得
 *   3. ExportEnvelope を組み立てて返す
 */
export async function collectExportData(eventStore: EventStore): Promise<ExportEnvelope>

/**
 * ExportEnvelopeをJSON文字列にシリアライズする。
 * 可読性のため2スペースインデントで整形する。
 */
export function serializeToJson(envelope: ExportEnvelope): string
```

**実装ポイント**:

```typescript
export async function collectExportData(eventStore: EventStore): Promise<ExportEnvelope> {
  const nodes = await eventStore.getAllNodes();
  const edges = await eventStore.getAllEdges();

  return {
    format: "kakicom-export",
    version: 1,
    exportedAt: Date.now(),
    data: { nodes, edges },
  };
}

export function serializeToJson(envelope: ExportEnvelope): string {
  return JSON.stringify(envelope, null, 2);
}
```

### デシリアライザ (`deserializer.ts`)

```typescript
import type { EventStore } from "../event-store/index.ts";
import type { ExportEnvelope, ImportResult, ImportStrategy } from "./types.ts";
import type { ValidationResult } from "./types.ts";
import { validateExportData } from "./validator.ts";

/**
 * JSON文字列をパースし、バリデーション済みのExportEnvelopeを返す。
 *
 * 手順:
 *   1. JSON.parse（SyntaxError時はエラー返却）
 *   2. validateExportData でスキーマ検証
 *   3. 成功時: ExportEnvelope を返す
 *   4. 失敗時: ValidationError[] を返す
 */
export function parseExportJson(json: string): ValidationResult

/**
 * ExportEnvelopeの内容をEventStoreにインポートする。
 *
 * strategy = "replace" の場合:
 *   1. eventStore.clear() で全データ削除
 *   2. 全Nodeを eventStore.saveNode() で保存
 *   3. 全Edgeを eventStore.saveEdge() で保存
 *   4. ImportResult を返す
 *
 * strategy = "merge" の場合:
 *   （将来実装。現段階では Error を throw）
 */
export async function importExportData(
  eventStore: EventStore,
  envelope: ExportEnvelope,
  strategy: ImportStrategy,
): Promise<ImportResult>
```

**実装ポイント**:

```typescript
export function parseExportJson(json: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return {
      ok: false,
      errors: [{ path: "(root)", message: "Invalid JSON" }],
    };
  }
  return validateExportData(parsed);
}

export async function importExportData(
  eventStore: EventStore,
  envelope: ExportEnvelope,
  strategy: ImportStrategy,
): Promise<ImportResult> {
  if (strategy === "merge") {
    throw new Error("merge strategy is not yet implemented");
  }

  // replace戦略: 全クリア → インポート
  await eventStore.clear();

  const { nodes, edges } = envelope.data;

  for (const record of nodes) {
    const snapshot = {
      node: record.node,
      dormancyState: record.dormancyState,
      updatedAt: record.updatedAt,
    };
    await eventStore.saveNode(snapshot, record.position ?? undefined);
  }

  for (const edge of edges) {
    await eventStore.saveEdge({
      id: edge.id,
      sourceNodeId: edge.sourceNodeId,
      targetNodeId: edge.targetNodeId,
      relation: edge.relation,
      label: edge.label,
      createdAt: edge.createdAt,
    });
  }

  return {
    strategy: "replace",
    nodesImported: nodes.length,
    edgesImported: edges.length,
    nodesSkipped: 0,
    edgesSkipped: 0,
  };
}
```

### index.ts 追記

```typescript
// Phase 1 の export に追加:
export { collectExportData, serializeToJson } from "./serializer.ts";
export { parseExportJson, importExportData } from "./deserializer.ts";
```

### 参照すべき既存パターン

| パターン | 参照ファイル |
|----------|-------------|
| EventStore インターフェース | `storage/event-store/types.ts` L100-169 |
| getAllNodes / getAllEdges | `storage/event-store/event-store.ts` L33-37, L70-74 |
| saveNode / saveEdge | `storage/event-store/event-store.ts` L20-31, L55-68 |
| clear() | `storage/event-store/event-store.ts` L96-109 |
| NodeSnapshot 構造 | `storage/event-store/types.ts` L47-51 |

### 注意事項

- `collectExportData` は EventStore から readonly 配列を受け取るため、コピーは不要
- `importExportData` の replace 戦略は `clear()` で全ストア（events, nodes, sessions, blobs, edges）をクリアする
- `saveNode` は第2引数 `position` が `undefined` の場合、null として保存される（既存実装の挙動）
- Edge の `saveEdge` は `Edge` 型を受け取るが、`PersistedEdgeRecord` と同一構造なのでそのままスプレッドで渡せる
- JSON.stringify / JSON.parse で ブランド型（`NodeId`, `EdgeId` 等）は string として透過的にシリアライズされる（ランタイムに情報なし）

---

## Phase 3: Storage — ファイルI/Oアダプタ

**目的**: ブラウザのFile APIを抽象化し、JSON文字列のファイル保存・読み込みを実現する。

**作成ファイル**:
- `app/src/storage/file-port/file-adapter.ts`

**変更ファイル**:
- `app/src/storage/file-port/index.ts` — 再エクスポート追加

### ファイルアダプタ (`file-adapter.ts`)

```typescript
/**
 * ファイル保存（エクスポート）。
 *
 * 実装戦略:
 *   1. window.showSaveFilePicker が使用可能な場合（Chrome 86+）:
 *      - showSaveFilePicker でファイルハンドルを取得
 *      - WritableStream に書き込み
 *   2. フォールバック（Firefox等）:
 *      - Blob + URL.createObjectURL でダウンロードリンクを生成
 *      - <a> 要素を動的に作成してクリック
 *      - URL.revokeObjectURL でクリーンアップ
 *
 * @param content - 保存するJSON文字列
 * @param suggestedName - 推奨ファイル名（例: "kakicom-2025-01-15.kakicom.json"）
 */
export async function saveFile(content: string, suggestedName: string): Promise<void>

/**
 * ファイル読み込み（インポート）。
 *
 * 実装戦略:
 *   1. window.showOpenFilePicker が使用可能な場合（Chrome 86+）:
 *      - showOpenFilePicker でファイルハンドルを取得
 *      - File.text() で内容を読み取り
 *   2. フォールバック（Firefox等）:
 *      - <input type="file"> を動的に作成
 *      - クリックイベントを発火
 *      - change イベントで File を取得
 *      - FileReader.readAsText で内容を読み取り
 *
 * @returns ファイル内容の文字列。ユーザーがキャンセルした場合は null。
 */
export async function loadFile(): Promise<string | null>

/**
 * File System Access API が利用可能かどうかを判定する。
 */
function hasFileSystemAccess(): boolean
```

**実装ポイント**:

```typescript
function hasFileSystemAccess(): boolean {
  return "showSaveFilePicker" in window && "showOpenFilePicker" in window;
}

const FILE_PICKER_OPTIONS = {
  types: [
    {
      description: "Kakicom Export",
      accept: { "application/json": [".kakicom.json"] },
    },
  ],
} as const;

export async function saveFile(content: string, suggestedName: string): Promise<void> {
  if (hasFileSystemAccess()) {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      ...FILE_PICKER_OPTIONS,
    });
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  } else {
    // フォールバック: ダウンロードリンク生成
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export async function loadFile(): Promise<string | null> {
  if (hasFileSystemAccess()) {
    let handles: FileSystemFileHandle[];
    try {
      handles = await window.showOpenFilePicker({
        multiple: false,
        ...FILE_PICKER_OPTIONS,
      });
    } catch {
      // ユーザーがキャンセル
      return null;
    }
    const file = await handles[0].getFile();
    return await file.text();
  } else {
    // フォールバック: <input type="file">
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".kakicom.json,.json";
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        resolve(await file.text());
      });
      input.click();
    });
  }
}
```

### index.ts 追記

```typescript
// Phase 1, 2 の export に追加:
export { saveFile, loadFile } from "./file-adapter.ts";
```

### TypeScript 型宣言の補足

File System Access API は TypeScript のデフォルト型定義に含まれない場合がある。必要に応じて `file-adapter.ts` 内で最小限の型宣言を追加する:

```typescript
// File System Access API の最小型宣言
// tsconfig の lib に含まれない場合のみ必要
declare global {
  interface Window {
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
    showOpenFilePicker?: (options?: OpenFilePickerOptions) => Promise<FileSystemFileHandle[]>;
  }

  interface SaveFilePickerOptions {
    suggestedName?: string;
    types?: FilePickerAcceptType[];
  }

  interface OpenFilePickerOptions {
    multiple?: boolean;
    types?: FilePickerAcceptType[];
  }

  interface FilePickerAcceptType {
    description?: string;
    accept: Record<string, string[]>;
  }
}
```

ただし、TypeScript 5.9 + `target: "ES2022"` + 最新 `lib` であればビルトイン型が存在する可能性がある。ビルド時に型エラーが出た場合のみ上記を追加すること。

### 参照すべき既存パターン

| パターン | 参照ファイル |
|----------|-------------|
| ブラウザAPI使用例 | `canvas/input/input-handler.ts`（DOM Event操作） |
| DOM要素操作 | `text-editor.ts`（動的DOM要素の作成・破棄） |
| 非同期処理パターン | `storage/event-store/event-store.ts`（async/await） |

### 注意事項

- File System Access API は Chrome 86+ で対応。Firefox / Safari は非対応（2025年時点）→ フォールバック必須
- `showSaveFilePicker` / `showOpenFilePicker` はユーザージェスチャ（クリック等）から呼び出す必要がある
- フォールバックの `<input type="file">` は一時的にDOMに追加→即削除。メモリリークに注意
- `loadFile` のフォールバックでは、ユーザーがダイアログをキャンセルした場合を検出しにくい（`change` イベントが発火しない）。タイムアウトは設けず、Promise が resolve されないケースを許容する（ガベージコレクション対象）
- `saveFile` フォールバックでは確実にダウンロードが開始されるが、保存先はブラウザのデフォルトダウンロードフォルダ

---

## Phase 4: App統合 — エクスポート/インポート操作

**目的**: file-port モジュールの全機能を app.ts に統合し、キーボードショートカットでエクスポート/インポートを実行可能にする。

**変更ファイル**:
- `app/src/app.ts` — エクスポート/インポート関数追加、handleAction拡張、App公開API拡張
- `app/src/canvas/input/types.ts` — InputAction に `export` / `import` アクション追加（または key アクションで直接処理）

### 操作フロー

**エクスポート**:
1. ユーザーが `Ctrl+S`（または `Cmd+S`）を押下
2. `collectExportData(eventStore)` で全データ収集
3. `serializeToJson(envelope)` でJSON文字列化
4. `saveFile(json, suggestedName)` でファイル保存ダイアログ表示
5. 成功/失敗をコンソールにログ出力

**インポート**:
1. ユーザーが `Ctrl+O`（または `Cmd+O`）を押下
2. `loadFile()` でファイル選択ダイアログ表示
3. ユーザーがキャンセルした場合は何もしない
4. `parseExportJson(content)` でパース+バリデーション
5. バリデーション失敗時はコンソールにエラー出力、処理中断
6. `importExportData(eventStore, envelope, "replace")` でインポート
7. `window.location.reload()` でページリロード（AppState再構築）

### キーボードイベント変更

ブラウザデフォルトの `Ctrl+S`（ページ保存）と `Ctrl+O`（ファイルを開く）を上書きする必要がある。InputHandler ではなく、`window` レベルで `keydown` を直接リッスンする:

```typescript
// app.ts の start() 内に追加
window.addEventListener("keydown", (e: KeyboardEvent) => {
  const mod = e.ctrlKey || e.metaKey;

  if (mod && e.key === "s") {
    e.preventDefault();
    handleExport();
  }

  if (mod && e.key === "o") {
    e.preventDefault();
    handleImport();
  }
});
```

**理由**: InputHandler はテキスト編集中（`textEditor.isOpen()`）に入力を無視するが、Ctrl+S / Ctrl+O はテキスト編集中でも有効であるべき。また、ブラウザデフォルト動作を `preventDefault()` で抑制する必要があるが、InputHandler の `InputAction` 経由ではこれができない。

### app.ts 変更

```typescript
// import 追加
import {
  collectExportData,
  serializeToJson,
  parseExportJson,
  importExportData,
  saveFile,
  loadFile,
} from "./storage/file-port/index.ts";

// createApp 内に以下の関数を追加:

/**
 * エクスポートファイル名を生成する。
 * 形式: "kakicom-YYYY-MM-DD.kakicom.json"
 */
function generateExportFileName(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `kakicom-${yyyy}-${mm}-${dd}.kakicom.json`;
}

async function handleExport(): Promise<void> {
  try {
    const envelope = await collectExportData(eventStore);
    const json = serializeToJson(envelope);
    await saveFile(json, generateExportFileName());
    console.log(
      `[kakicom] exported: ${envelope.data.nodes.length} nodes, ${envelope.data.edges.length} edges`,
    );
  } catch (err) {
    console.error("[kakicom] export failed:", err);
  }
}

async function handleImport(): Promise<void> {
  try {
    const content = await loadFile();
    if (content === null) return; // ユーザーキャンセル

    const result = parseExportJson(content);
    if (!result.ok) {
      console.error("[kakicom] import validation failed:", result.errors);
      return;
    }

    const importResult = await importExportData(eventStore, result.data, "replace");
    console.log(
      `[kakicom] imported: ${importResult.nodesImported} nodes, ${importResult.edgesImported} edges`,
    );

    // AppState再構築のためリロード
    window.location.reload();
  } catch (err) {
    console.error("[kakicom] import failed:", err);
  }
}

// start() 内に keydown リスナー追加（上述）
```

### App 公開API拡張（任意）

```typescript
export interface App {
  start(): void;
  resize(): void;
  exportToFile(): Promise<void>;   // 追加: プログラマティックにエクスポート
  importFromFile(): Promise<void>; // 追加: プログラマティックにインポート
}
```

外部から `app.exportToFile()` / `app.importFromFile()` を呼べるようにする。将来UIボタンを追加する際に便利。

### 参照すべき既存パターン

| パターン | 参照ファイル |
|----------|-------------|
| AppState構造 | `app.ts` L34-43 |
| handleAction (key) | `app.ts` L382-401 |
| start() メソッド | `app.ts` L407-429 |
| App 公開API | `app.ts` L45-48 |
| EventStore使用 | `app.ts` L249, L268-269, L286 |
| window.addEventListener | `main.ts` L22 |

### 注意事項

- `Ctrl+S` はブラウザの「ページを保存」、`Ctrl+O` は「ファイルを開く」を上書きする。`e.preventDefault()` を忘れるとブラウザ標準ダイアログが開く
- macOS対応: `e.metaKey`（Cmd）も判定に含める
- `handleImport` の replace 戦略はIndexedDBの全データを消去する。**確認なし**でリプレースする（MVP簡素化）。将来的に確認ダイアログの追加を検討
- `window.location.reload()` は最もシンプルなAppState再構築手段。将来的にはインメモリで再構築（state をリセットして initialRecords を再読み込み）に改善可能
- `keydown` リスナーは `start()` 内で登録し、`destroy()` メソッドの導入は不要（MVP段階ではアプリのライフサイクル管理は最小限）

---

## Phase 5（将来）: Blobアーカイブ対応

**目的**: 画像データを含むエクスポート/インポート。Phase 4 までの実装では不要。blob-store が実装された後に着手する。

**概要のみ**:
- ファイル形式を `.kakicom.zip` に変更（ZIP アーカイブ）
- ZIP 内構造:
  ```
  manifest.json          ← 現在の ExportEnvelope（version: 2）
  blobs/
    {blobId}.{ext}       ← 画像バイナリ
  ```
- `ExportEnvelope.version` を `2` に上げ、`data.blobs` を追加
- ZIP生成/展開には軽量ライブラリ（fflate 等）を使用
- `validateExportData` を version 2 にも対応させる（後方互換）

---

## フェーズ依存関係

```
Phase 1 (型定義 + バリデーション)
  ├──→ Phase 2 (シリアライズ/デシリアライズ)
  └──→ Phase 3 (ファイルI/O)
         │              │
         └──────┬───────┘
                ↓
       Phase 4 (App統合)
                ↓
       Phase 5 (将来: Blobアーカイブ)
```

Phase 2 と Phase 3 は **並列実行可能**。Phase 4 は Phase 2 + Phase 3 に依存。Phase 5 は Phase 4 完了後、blob-store 実装後に着手。

---

## ビルド検証

各フェーズ完了後に `pnpm build`（`app/` ディレクトリ内）を実行し、型エラーがないことを確認する。

Phase 4 完了後に `pnpm dev` で開発サーバーを起動し、以下を手動確認:

1. **エクスポート**: `Ctrl+S` → ファイル保存ダイアログ表示 → `.kakicom.json` ファイル保存
2. **ファイル内容確認**: 保存されたJSONを開き、nodes / edges が正しく含まれていること
3. **インポート（空の状態へ）**: DevToolsで IndexedDB を手動削除 → `Ctrl+O` → 先ほどのファイルを選択 → ページリロード → 元のNodes / Edges が復元されること
4. **インポート（既存データありの状態へ）**: Nodeを追加 → `Ctrl+O` → ファイル選択 → リロード → ファイルの内容のみが存在すること（replace戦略）
5. **不正ファイルのインポート**: 空のJSONファイルを `Ctrl+O` で読み込み → コンソールにバリデーションエラーが出力されること
6. **キャンセル**: `Ctrl+O` → ダイアログをキャンセル → 何も起こらないこと

---

## ファイルツリー（完成時）

```
storage/
├── db/                      # （既存・変更なし）
├── event-store/             # （既存・変更なし）
├── blob-store/              # （既存・変更なし）
└── file-port/               # 新規
    ├── types.ts             # Phase 1: ExportEnvelope, ExportData 等
    ├── validator.ts         # Phase 1: ランタイムバリデーション
    ├── serializer.ts        # Phase 2: EventStore → ExportEnvelope → JSON
    ├── deserializer.ts      # Phase 2: JSON → ExportEnvelope → EventStore
    ├── file-adapter.ts      # Phase 3: ブラウザ File API 抽象化
    └── index.ts             # 全フェーズ: 公開API再エクスポート
```
