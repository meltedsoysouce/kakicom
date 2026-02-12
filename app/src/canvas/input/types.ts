import type { ScreenPoint, WorldPoint, WorldRect } from "../viewport/index.ts";
import type { HitTarget } from "../hit-test/index.ts";
import type { NodeId } from "../../model/node/index.ts";
import type { EdgeId } from "../../model/edge/index.ts";
import type { Affordance } from "../../model/view/index.ts";
import type { ViewportState } from "../viewport/index.ts";
import type { HitTester } from "../hit-test/index.ts";

// ── InputAction ──

/**
 * DOM入力イベントから変換された意味的アクション。
 * 上位層はInputActionのみを処理し、DOMイベントを直接扱わない。
 */
export type InputAction =
  | PanAction
  | PanEndAction
  | ZoomAction
  | NodeClickAction
  | NodeDoubleClickAction
  | NodeDragStartAction
  | NodeDragMoveAction
  | NodeDragEndAction
  | EdgeClickAction
  | BackgroundClickAction
  | BackgroundDoubleClickAction
  | RectSelectStartAction
  | RectSelectMoveAction
  | RectSelectEndAction
  | PasteAction
  | HoverAction
  | KeyAction;

/** キャンバスのパン操作。 */
export interface PanAction {
  readonly type: "pan";
  readonly deltaScreenX: number;
  readonly deltaScreenY: number;
}

/** パン操作の終了。 */
export interface PanEndAction {
  readonly type: "pan_end";
}

/** ズーム操作。 */
export interface ZoomAction {
  readonly type: "zoom";
  readonly focusScreen: ScreenPoint;
  readonly delta: number;
}

/** Nodeの単クリック。 */
export interface NodeClickAction {
  readonly type: "node_click";
  readonly nodeId: NodeId;
  readonly worldPoint: WorldPoint;
  readonly shiftKey: boolean;
}

/** Nodeのダブルクリック。→ 編集モード開始のトリガー。 */
export interface NodeDoubleClickAction {
  readonly type: "node_double_click";
  readonly nodeId: NodeId;
  readonly worldPoint: WorldPoint;
}

/** Nodeドラッグの開始。 */
export interface NodeDragStartAction {
  readonly type: "node_drag_start";
  readonly nodeId: NodeId;
  readonly worldPoint: WorldPoint;
}

/** Nodeドラッグの途中移動。 */
export interface NodeDragMoveAction {
  readonly type: "node_drag_move";
  readonly nodeId: NodeId;
  readonly worldPoint: WorldPoint;
  readonly deltaWorldX: number;
  readonly deltaWorldY: number;
}

/** Nodeドラッグの終了。 */
export interface NodeDragEndAction {
  readonly type: "node_drag_end";
  readonly nodeId: NodeId;
  readonly worldPoint: WorldPoint;
  readonly totalDeltaWorldX: number;
  readonly totalDeltaWorldY: number;
}

/** Edgeの単クリック。→ Edge選択のトリガー。 */
export interface EdgeClickAction {
  readonly type: "edge_click";
  readonly edgeId: EdgeId;
  readonly sourceNodeId: NodeId;
  readonly targetNodeId: NodeId;
  readonly worldPoint: WorldPoint;
}

/** 背景の単クリック。→ 選択解除のトリガー。 */
export interface BackgroundClickAction {
  readonly type: "background_click";
  readonly worldPoint: WorldPoint;
}

/** 背景のダブルクリック。→ 新規Node作成のトリガー。 */
export interface BackgroundDoubleClickAction {
  readonly type: "background_double_click";
  readonly worldPoint: WorldPoint;
}

/** 矩形選択の開始。 */
export interface RectSelectStartAction {
  readonly type: "rect_select_start";
  readonly worldPoint: WorldPoint;
}

/** 矩形選択の範囲更新。 */
export interface RectSelectMoveAction {
  readonly type: "rect_select_move";
  readonly worldPoint: WorldPoint;
  readonly selectionRect: WorldRect;
}

/** 矩形選択の確定。 */
export interface RectSelectEndAction {
  readonly type: "rect_select_end";
  readonly selectionRect: WorldRect;
  readonly selectedNodeIds: readonly NodeId[];
}

/** クリップボードからのペースト。 */
export interface PasteAction {
  readonly type: "paste";
  readonly worldPoint: WorldPoint;
  readonly content: PasteContent;
}

/** ペースト内容。 */
export type PasteContent =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "image"; readonly blob: Blob; readonly mime: string };

/** ポインタのホバー状態変化。 */
export interface HoverAction {
  readonly type: "hover";
  readonly target: HitTarget;
  readonly worldPoint: WorldPoint;
}

/** キーボード操作。 */
export interface KeyAction {
  readonly type: "key";
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
}

// ── DragState ──

/**
 * ドラッグ操作の状態マシン。
 */
export type DragState =
  | IdleState
  | PanningState
  | DraggingNodeState
  | RectSelectingState;

export interface IdleState {
  readonly type: "idle";
}

export interface PanningState {
  readonly type: "panning";
  readonly startScreen: ScreenPoint;
  readonly lastScreen: ScreenPoint;
}

export interface DraggingNodeState {
  readonly type: "dragging_node";
  readonly nodeId: NodeId;
  readonly startWorld: WorldPoint;
  readonly lastWorld: WorldPoint;
}

export interface RectSelectingState {
  readonly type: "rect_selecting";
  readonly startWorld: WorldPoint;
  readonly currentWorld: WorldPoint;
}

// ── InputConfig ──

/**
 * 入力処理の設定。
 */
export interface InputConfig {
  /** ドラッグ開始と判定するピクセル閾値 */
  readonly dragThreshold: number;
  /** ダブルクリックの最大間隔（ミリ秒） */
  readonly doubleClickInterval: number;
  /** ホイールズームの感度 */
  readonly wheelZoomSensitivity: number;
  /** タッチピンチズームの感度 */
  readonly pinchZoomSensitivity: number;
}

// ── InputHandler ──

/**
 * DOM入力イベントを処理し、InputActionに変換するハンドラー。
 */
export interface InputHandler {
  /** Canvas要素にイベントリスナーをアタッチする。 */
  attach(canvas: HTMLCanvasElement): void;
  /** イベントリスナーを解除する。 */
  detach(): void;
  /** InputAction発行時のコールバックを登録する。 */
  onAction(callback: (action: InputAction) => void): void;
  /** 現在のDragStateを取得する。 */
  getDragState(): DragState;
  /** 現在有効なAffordanceリストを設定する。 */
  setAffordances(affordances: readonly Affordance[]): void;
  /** InputConfigを更新する。 */
  setConfig(config: Partial<InputConfig>): void;
  /** ViewportStateを更新する（座標変換に使用）。 */
  setViewport(state: ViewportState): void;
}

/**
 * createInputHandler のパラメータ型。
 */
export interface InputHandlerParams {
  readonly viewport: ViewportState;
  readonly hitTester: HitTester;
  readonly affordances?: readonly Affordance[];
  readonly config?: Partial<InputConfig>;
}
