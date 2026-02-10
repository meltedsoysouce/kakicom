import type {
  DragState,
  InputAction,
} from "./types.ts";
import type { HitTarget } from "../hit-test/index.ts";
import type { ScreenPoint, WorldPoint } from "../viewport/index.ts";

interface DragMachineState {
  drag: DragState;
  pendingTarget: HitTarget | null;
  mousedownScreen: ScreenPoint | null;
  mousedownWorld: WorldPoint | null;
}

function screenDistance(a: ScreenPoint, b: ScreenPoint): number {
  const dx = a.sx - b.sx;
  const dy = a.sy - b.sy;
  return Math.sqrt(dx * dx + dy * dy);
}

export interface DragMachine {
  getState(): DragState;
  getPendingTarget(): HitTarget | null;
  onMouseDown(screenPoint: ScreenPoint, worldPoint: WorldPoint, hitTarget: HitTarget): void;
  onMouseMove(screenPoint: ScreenPoint, worldPoint: WorldPoint, threshold: number): InputAction | null;
  onMouseUp(screenPoint: ScreenPoint, worldPoint: WorldPoint): InputAction | null;
  reset(): void;
}

/**
 * ドラッグ操作の状態マシンを生成する。
 *
 * 状態遷移:
 * - idle → mousedown(背景) → panning
 * - idle → mousedown(node) → pending（idle + pendingTarget保持）
 * - pending → mousemove(threshold超え) → dragging_node
 * - pending → mouseup(threshold未満) → idle (NodeClickAction)
 * - panning → mousemove → PanAction
 * - panning → mouseup → PanEndAction / BackgroundClickAction
 * - dragging_node → mousemove → NodeDragMoveAction
 * - dragging_node → mouseup → NodeDragEndAction
 */
export function createDragMachine(): DragMachine {
  const state: DragMachineState = {
    drag: { type: "idle" },
    pendingTarget: null,
    mousedownScreen: null,
    mousedownWorld: null,
  };

  return {
    getState(): DragState {
      return state.drag;
    },

    getPendingTarget(): HitTarget | null {
      return state.pendingTarget;
    },

    onMouseDown(screenPoint: ScreenPoint, worldPoint: WorldPoint, hitTarget: HitTarget): void {
      state.mousedownScreen = screenPoint;
      state.mousedownWorld = worldPoint;
      state.pendingTarget = hitTarget;

      if (hitTarget.type === "background") {
        // 背景 → パン開始（即座に）
        state.drag = {
          type: "panning",
          startScreen: screenPoint,
          lastScreen: screenPoint,
        };
      } else {
        // Node → pending状態（idleのまま、pendingTargetで保持）
        state.drag = { type: "idle" };
      }
    },

    onMouseMove(screenPoint: ScreenPoint, worldPoint: WorldPoint, threshold: number): InputAction | null {
      // パン中
      if (state.drag.type === "panning") {
        const deltaScreenX = screenPoint.sx - state.drag.lastScreen.sx;
        const deltaScreenY = screenPoint.sy - state.drag.lastScreen.sy;
        state.drag = {
          type: "panning",
          startScreen: state.drag.startScreen,
          lastScreen: screenPoint,
        };
        return { type: "pan", deltaScreenX, deltaScreenY };
      }

      // Nodeドラッグ中
      if (state.drag.type === "dragging_node") {
        const deltaWorldX = worldPoint.wx - state.drag.lastWorld.wx;
        const deltaWorldY = worldPoint.wy - state.drag.lastWorld.wy;
        const nodeId = state.drag.nodeId;
        state.drag = {
          type: "dragging_node",
          nodeId,
          startWorld: state.drag.startWorld,
          lastWorld: worldPoint,
        };
        return {
          type: "node_drag_move",
          nodeId,
          worldPoint,
          deltaWorldX,
          deltaWorldY,
        };
      }

      // pending状態（Node上でmousedownした後、まだthresholdを超えていない）
      if (
        state.drag.type === "idle" &&
        state.pendingTarget !== null &&
        state.pendingTarget.type === "node" &&
        state.mousedownScreen !== null
      ) {
        const dist = screenDistance(screenPoint, state.mousedownScreen);
        if (dist >= threshold) {
          // threshold超え → ドラッグ開始
          const nodeId = state.pendingTarget.nodeId;
          const startWorld = state.mousedownWorld!;
          state.drag = {
            type: "dragging_node",
            nodeId,
            startWorld,
            lastWorld: worldPoint,
          };
          return {
            type: "node_drag_start",
            nodeId,
            worldPoint: startWorld,
          };
        }
      }

      return null;
    },

    onMouseUp(screenPoint: ScreenPoint, worldPoint: WorldPoint): InputAction | null {
      const prevDrag = state.drag;
      const pendingTarget = state.pendingTarget;
      const mousedownScreen = state.mousedownScreen;

      // Reset state
      state.drag = { type: "idle" };
      state.pendingTarget = null;
      state.mousedownScreen = null;
      state.mousedownWorld = null;

      // パン終了
      if (prevDrag.type === "panning") {
        // 移動量が小さい場合はクリック扱い
        if (mousedownScreen && screenDistance(screenPoint, mousedownScreen) < 4) {
          return { type: "background_click", worldPoint };
        }
        return { type: "pan_end" };
      }

      // Nodeドラッグ終了
      if (prevDrag.type === "dragging_node") {
        return {
          type: "node_drag_end",
          nodeId: prevDrag.nodeId,
          worldPoint,
          totalDeltaWorldX: worldPoint.wx - prevDrag.startWorld.wx,
          totalDeltaWorldY: worldPoint.wy - prevDrag.startWorld.wy,
        };
      }

      // pending状態でmouseup → クリック
      if (
        prevDrag.type === "idle" &&
        pendingTarget !== null &&
        pendingTarget.type === "node"
      ) {
        return {
          type: "node_click",
          nodeId: pendingTarget.nodeId,
          worldPoint,
          shiftKey: false, // shiftKey は input-handler 側で設定
        };
      }

      return null;
    },

    reset(): void {
      state.drag = { type: "idle" };
      state.pendingTarget = null;
      state.mousedownScreen = null;
      state.mousedownWorld = null;
    },
  };
}
