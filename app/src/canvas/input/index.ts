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

import type { InputConfig } from "./types.ts";

// ── InputHandler 生成 ──

export { createInputHandler } from "./input-handler.ts";

// ── DragMachine ──

export { createDragMachine } from "./drag-machine.ts";
export type { DragMachine } from "./drag-machine.ts";

// ── 定数 ──

/** デフォルトのInputConfig。 */
export const DEFAULT_INPUT_CONFIG: InputConfig = {
  dragThreshold: 4,
  doubleClickInterval: 300,
  wheelZoomSensitivity: 0.001,
  pinchZoomSensitivity: 0.01,
};
