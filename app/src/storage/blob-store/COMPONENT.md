# storage/blob-store/ — バイナリデータストアコンポーネント

## 1. 概要

本コンポーネントは画像などの**バイナリデータの永続化**を担当する。
ImagePayload / MixedPayload が参照する画像Blobを
IndexedDB の blobs ObjectStore に保存・取得する。

テキストデータ（ThoughtEvent, Nodeスナップショット）と
バイナリデータ（画像Blob）を分離することで、
クエリ性能への影響を最小限にし、
将来のストレージ戦略変更（外部ストレージ等）を容易にする。

---

## 2. 責務

- 画像Blobの保存（BlobId → Blob）
- 画像Blobの取得
- 画像BlobのObject URL生成（描画用）
- Object URLのライフサイクル管理（revoke）
- 画像メタデータ（サイズ、MIME型）の取得
- 未参照Blobの検出（ガベージコレクション候補の特定）
- サムネイル生成（将来）

### 責務に含まれないもの

- BlobIdの生成（→ model/node/ の generateBlobId）
- IndexedDBスキーマの管理（→ db/）
- Node内でのBlobId参照管理（→ model/node/）
- 画像のUIレンダリング（→ canvas/renderer/）

---

## 3. 設計原則

1. **BlobIdで参照** — Payload内にBlobそのものを埋め込まない
2. **Object URLを管理する** — メモリリークを防ぐため生成と破棄を追跡する
3. **非同期** — Blobの読み書きはすべてPromise
4. **分離可能** — 将来的にIndexedDB以外のストレージに差し替え可能

---

## 4. 公開データ構造

### 4.1 BlobRecord

```typescript
/**
 * IndexedDBに保存するBlobレコード。
 * Blobの実データとメタデータを保持する。
 */
interface BlobRecord {
  readonly id: BlobId;
  readonly data: Blob;
  readonly mime: string;
  readonly size: number;
  readonly width: number | null;
  readonly height: number | null;
  readonly createdAt: Timestamp;
}
```

### 4.2 BlobMeta

```typescript
/**
 * Blobのメタデータ（実データを含まない軽量版）。
 * 一覧表示やフィルタリングに使用する。
 */
interface BlobMeta {
  readonly id: BlobId;
  readonly mime: string;
  readonly size: number;
  readonly width: number | null;
  readonly height: number | null;
  readonly createdAt: Timestamp;
}
```

### 4.3 BlobInput

```typescript
/**
 * Blob保存時の入力データ。
 * ペーストやドロップで受け取った生データから構築する。
 */
interface BlobInput {
  readonly data: Blob;
  readonly mime: string;
}
```

### 4.4 ObjectURLHandle

```typescript
/**
 * Object URLの参照ハンドル。
 * 使い終わったらrevoke()を呼んでメモリを解放する。
 */
interface ObjectURLHandle {
  readonly url: string;
  readonly blobId: BlobId;

  /**
   * Object URLを破棄する。
   * 破棄後、このURLでの画像表示は無効になる。
   */
  revoke(): void;
}
```

### 4.5 BlobStoreStats

```typescript
/**
 * Blobストアの統計情報。
 */
interface BlobStoreStats {
  readonly blobCount: number;
  readonly totalSizeBytes: number;
}
```

---

## 5. 公開インターフェース

### 5.1 BlobStore

```typescript
/**
 * バイナリデータの永続化を管理するストア。
 */
interface BlobStore {
  // ── 保存 ──

  /**
   * Blobを保存する。
   * 画像の場合、自動的にwidth/heightを検出する。
   * 生成されたBlobIdを返す。
   */
  save(input: BlobInput): Promise<BlobId>;

  /**
   * 指定IDでBlobを保存する（IDを事前生成済みの場合）。
   */
  saveWithId(id: BlobId, input: BlobInput): Promise<void>;

  // ── 取得 ──

  /**
   * BlobIdからBlobRecordを取得する。
   * 存在しない場合はnull。
   */
  get(id: BlobId): Promise<BlobRecord | null>;

  /**
   * BlobIdからBlob実データのみを取得する。
   * 存在しない場合はnull。
   */
  getData(id: BlobId): Promise<Blob | null>;

  /**
   * BlobIdからメタデータのみを取得する。
   * 実データを読み込まない軽量版。
   */
  getMeta(id: BlobId): Promise<BlobMeta | null>;

  /**
   * 指定IDのBlobが存在するかを判定する。
   */
  has(id: BlobId): Promise<boolean>;

  // ── Object URL ──

  /**
   * BlobのObject URLを生成する。
   * 返されたハンドルのrevoke()でURLを破棄する。
   *
   * 同一BlobIdに対して複数回呼んでも毎回新しいURLが生成される。
   */
  createObjectURL(id: BlobId): Promise<ObjectURLHandle | null>;

  /**
   * 全ての未破棄Object URLを一括破棄する。
   * アプリ終了時やView切替時に呼び出す。
   */
  revokeAll(): void;

  // ── 削除 ──

  /**
   * Blobを削除する。
   * 関連するObject URLも自動的にrevokeされる。
   */
  delete(id: BlobId): Promise<void>;

  // ── ユーティリティ ──

  /**
   * 全Blobのメタデータ一覧を取得する。
   */
  listAll(): Promise<readonly BlobMeta[]>;

  /**
   * ストアの統計情報を取得する。
   */
  getStats(): Promise<BlobStoreStats>;

  /**
   * 全データをクリアする。
   * 開発・テスト用。
   */
  clear(): Promise<void>;
}
```

### 5.2 BlobStore 生成

```typescript
/**
 * BlobStoreを生成する。
 * db/ のDatabase接続を受け取る。
 */
function createBlobStore(db: Database): BlobStore;
```

### 5.3 画像ユーティリティ

```typescript
/**
 * Blobが画像かどうかをMIME型で判定する。
 */
function isImageMime(mime: string): boolean;

/**
 * 画像BlobからWidth/Heightを検出する。
 * ImageBitmapまたはImage要素を使ってデコードする。
 */
function detectImageSize(blob: Blob): Promise<{
  width: number;
  height: number;
} | null>;

/**
 * クリップボードのDataTransferから画像Blobを抽出する。
 * 画像が含まれていない場合はnull。
 */
function extractImageFromClipboard(
  dataTransfer: DataTransfer
): BlobInput | null;

/**
 * ドラッグ＆ドロップのDataTransferから画像Blobを抽出する。
 */
function extractImageFromDrop(
  dataTransfer: DataTransfer
): BlobInput | null;
```

### 5.4 ガベージコレクション

```typescript
/**
 * Nodeが参照していないBlobIdの一覧を返す。
 * event-store/ の全NodeSnapshotと照合して、
 * どのNodeからも参照されていないBlobを検出する。
 *
 * 削除の実行は上位層の判断に委ねる（自動削除しない）。
 */
function findUnreferencedBlobs(
  allBlobIds: readonly BlobId[],
  allNodes: readonly NodeSnapshot[]
): readonly BlobId[];
```

---

## 6. ファイル構成（想定）

```
storage/blob-store/
├── COMPONENT.md        # 本ドキュメント
├── types.ts            # BlobRecord, BlobMeta, BlobInput, ObjectURLHandle, BlobStoreStats
├── blob-store.ts       # BlobStore実装
├── image-utils.ts      # isImageMime, detectImageSize, extractImageFromClipboard
├── gc.ts               # findUnreferencedBlobs
└── index.ts            # 公開APIの再エクスポート
```

---

## 7. 依存関係

```
storage/blob-store/ → storage/db/       (Database接続、ObjectStoreアクセス)
storage/blob-store/ → model/node/       (BlobId, Timestamp)
```

blob-store/ は db/ を通じてIndexedDBにアクセスする。
event-store/ とは直接依存せず、並列関係にある。

```
storage/
├── db/            ← 基盤（event-store/とblob-store/の両方が依存）
├── event-store/   ← db/ に依存
└── blob-store/    ← db/ に依存
```

findUnreferencedBlobs は NodeSnapshot 型を参照するが、
これはユーティリティ関数の引数としてのみ使用し、
blob-store/ が event-store/ をimportすることはない。

---

## 8. 不変条件

1. **BlobRecord.id はBlobStoreの中で一意**
2. **save() は常に新しいBlobIdを生成して返す**
3. **get() で取得したBlobRecord.data はIndexedDBから復元されたBlobオブジェクト**
4. **createObjectURL() の戻り値のrevoke() は1回だけ呼ぶ**（2回呼んでもエラーにはしない）
5. **revokeAll() 後、それまでに生成されたObject URLは全て無効**
6. **delete() は関連Object URLも自動revoke**

---

## 9. Object URLライフサイクル

```
save(blob)
  → BlobId

createObjectURL(blobId)
  → ObjectURLHandle { url: "blob:...", revoke() }

<img src={handle.url} />   ← 表示に使用

handle.revoke()             ← 不要になったら破棄
  → URL.revokeObjectURL(url)
  → メモリ解放
```

Object URLはブラウザのメモリに保持されるため、
使い終わったら必ず revoke() を呼ぶ必要がある。
BlobStore は生成したハンドルを内部で追跡し、
revokeAll() で一括破棄できるようにする。

---

## 10. 将来の拡張

### サムネイル生成

Node一覧やミニマップでの描画を高速化するため、
保存時にサムネイル画像を自動生成する。

```
BlobRecord + ThumbnailRecord {
  id: BlobId
  thumbnail: Blob        // 縮小版（例: 200x200以下）
  thumbnailMime: string
}
```

### 外部ストレージ

IndexedDBの容量制限を超える場合、
Origin Private File System (OPFS) や外部APIへの
ストレージバックエンド差し替えを検討する。
BlobStore インターフェースは変更せず、内部実装のみ差し替える。

### 重複検出

同一画像の重複保存を防ぐため、
Blobのハッシュ値（SHA-256等）による重複検出を検討する。
