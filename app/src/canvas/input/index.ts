export type {
  InputAction,
  PanAction,
  PanEndAction,
  ZoomAction,
  NodeClickAction,
  NodeDoubleClickAction,
  NodeDragStartAction,
  NodeDragMoveAction,
  NodeDragEndAction,
  BackgroundClickAction,
  BackgroundDoubleClickAction,
  RectSelectStartAction,
  RectSelectMoveAction,
  RectSelectEndAction,
  PasteAction,
  PasteContent,
  HoverAction,
  KeyAction,
  DragState,
  IdleState,
  PanningState,
  DraggingNodeState,
  RectSelectingState,
  InputConfig,
  InputHandler,
  InputHandlerParams,
} from "./types.ts";

import type {
  InputConfig,
  InputHandler,
  InputHandlerParams,
} from "./types.ts";

// ── InputHandler 生成 ──

/**
 * InputHandlerを生成する。
 *
 * viewport: 座標変換に使用
 * hitTester: ヒットテストに使用
 */
export function createInputHandler(
  _params: InputHandlerParams,
): InputHandler {
  throw new Error("not implemented");
}

// ── 定数 ──

/** デフォルトのInputConfig。 */
export const DEFAULT_INPUT_CONFIG: InputConfig = {
  dragThreshold: 4,
  doubleClickInterval: 300,
  wheelZoomSensitivity: 0.001,
  pinchZoomSensitivity: 0.01,
};
