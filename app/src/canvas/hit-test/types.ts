import type { WorldPoint, WorldRect } from "../viewport/index.ts";
import type { NodeId } from "../../model/node/index.ts";

/**
 * ヒットテストの結果。
 * ポインタ位置にNodeがあればnodeIdを返し、なければbackground。
 */
export type HitTarget =
  | { readonly type: "node"; readonly nodeId: NodeId }
  | {
      readonly type: "edge";
      readonly sourceNodeId: NodeId;
      readonly targetNodeId: NodeId;
    }
  | { readonly type: "background" };

/**
 * ヒットテスト対象のNode情報。
 * Nodeのワールド座標上のバウンディングボックスを保持する。
 */
export interface HitTestEntry {
  readonly nodeId: NodeId;
  readonly bounds: WorldRect;
  readonly zIndex: number;
}

/**
 * ヒットテスト可能なシーン全体。
 * 現在画面上に存在する全Nodeのバウンディングボックスを保持する。
 */
export interface HitTestableScene {
  readonly entries: readonly HitTestEntry[];
}

/**
 * 矩形選択の範囲。
 * ドラッグ開始点と現在点から算出される。
 */
export interface SelectionRect {
  readonly start: WorldPoint;
  readonly end: WorldPoint;
  readonly rect: WorldRect;
}

/**
 * ヒットテストのオプション。
 */
export interface HitTestOptions {
  /** ポイントヒットの許容マージン（ワールド座標単位） */
  readonly margin: number;
  /** DormancyState.Dormant のNodeをヒット対象にするか */
  readonly includeDormant: boolean;
  /** DormancyState.Archived のNodeをヒット対象にするか */
  readonly includeArchived: boolean;
}

/**
 * ヒットテストを実行するオブジェクト。
 * シーンが更新されるたびに setScene() で最新データを反映する。
 */
export interface HitTester {
  /** ヒットテスト対象のシーンを設定する。 */
  setScene(scene: HitTestableScene): void;

  /**
   * ワールド座標上の1点に対してヒットテストを実行する。
   * 最前面（zIndexが最大）のNodeを返す。
   * ヒットしなければ { type: "background" } を返す。
   */
  hitTestPoint(
    point: WorldPoint,
    options?: Partial<HitTestOptions>,
  ): HitTarget;

  /**
   * ワールド座標上の矩形に含まれるNode一覧を返す。
   * 完全包含 or 交差のどちらかを選べる。
   */
  hitTestRect(
    rect: WorldRect,
    mode: "contains" | "intersects",
    options?: Partial<HitTestOptions>,
  ): readonly NodeId[];

  /**
   * 指定NodeIdのバウンディングボックスを取得する。
   * 存在しない場合はnull。
   */
  getBounds(nodeId: NodeId): WorldRect | null;

  /**
   * ビューポート内に見えている全NodeIdを返す。
   */
  getVisibleNodes(viewportRect: WorldRect): readonly NodeId[];
}
