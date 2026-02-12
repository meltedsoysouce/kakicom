import type {
  InputAction,
  InputConfig,
  InputHandler,
  InputHandlerParams,
} from "./types.ts";
import type { ViewportState, ScreenPoint, WorldPoint } from "../viewport/index.ts";
import type { Affordance } from "../../model/view/index.ts";
import { screenToWorld } from "../viewport/transform.ts";
import { createDragMachine } from "./drag-machine.ts";

const DEFAULT_CONFIG: InputConfig = {
  dragThreshold: 4,
  doubleClickInterval: 300,
  wheelZoomSensitivity: 0.001,
  pinchZoomSensitivity: 0.01,
};

/**
 * InputHandlerを生成する。
 * DOM マウスイベントを InputAction に変換し、コールバックで通知する。
 */
export function createInputHandler(
  params: InputHandlerParams,
): InputHandler {
  const { hitTester } = params;
  let viewport: ViewportState = params.viewport;
  let callback: ((action: InputAction) => void) | null = null;
  let canvas: HTMLCanvasElement | null = null;
  const config: InputConfig = { ...DEFAULT_CONFIG, ...params.config };
  const machine = createDragMachine();

  function emit(action: InputAction): void {
    callback?.(action);
  }

  function getScreenPoint(e: MouseEvent): ScreenPoint {
    const rect = canvas!.getBoundingClientRect();
    return {
      sx: e.clientX - rect.left,
      sy: e.clientY - rect.top,
    };
  }

  function getWorldPoint(screenPoint: ScreenPoint): WorldPoint {
    return screenToWorld(viewport, screenPoint);
  }

  // ── Event handlers ──

  function onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return; // 左ボタンのみ
    const screen = getScreenPoint(e);
    const world = getWorldPoint(screen);
    const hit = hitTester.hitTestPoint(world);
    machine.onMouseDown(screen, world, hit);
  }

  function onMouseMove(e: MouseEvent): void {
    const screen = getScreenPoint(e);
    const world = getWorldPoint(screen);
    const action = machine.onMouseMove(screen, world, config.dragThreshold);
    if (action) {
      // NodeClickAction の shiftKey を上書き
      if (action.type === "node_click") {
        emit({ ...action, shiftKey: e.shiftKey });
      } else {
        emit(action);
      }
    }
  }

  function onMouseUp(e: MouseEvent): void {
    if (e.button !== 0) return;
    const screen = getScreenPoint(e);
    const world = getWorldPoint(screen);
    const action = machine.onMouseUp(screen, world);
    if (action) {
      // NodeClickAction の shiftKey を上書き
      if (action.type === "node_click") {
        emit({ ...action, shiftKey: e.shiftKey });
      } else {
        emit(action);
      }
    }
  }

  function onWheel(e: WheelEvent): void {
    e.preventDefault();
    const screen = getScreenPoint(e);
    emit({
      type: "zoom",
      focusScreen: screen,
      delta: e.deltaY,
    });
  }

  function onDblClick(e: MouseEvent): void {
    const screen = getScreenPoint(e);
    const world = getWorldPoint(screen);
    const hit = hitTester.hitTestPoint(world);
    if (hit.type === "node") {
      emit({ type: "node_double_click", nodeId: hit.nodeId, worldPoint: world });
    } else {
      emit({ type: "background_double_click", worldPoint: world });
    }
  }

  function onKeyDown(e: KeyboardEvent): void {
    emit({
      type: "key",
      key: e.key,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
    });
  }

  function onContextMenu(e: MouseEvent): void {
    e.preventDefault();
  }

  // ── Public API ──

  const handler: InputHandler = {
    attach(c: HTMLCanvasElement): void {
      canvas = c;
      canvas.addEventListener("mousedown", onMouseDown);
      canvas.addEventListener("mousemove", onMouseMove);
      canvas.addEventListener("mouseup", onMouseUp);
      canvas.addEventListener("wheel", onWheel, { passive: false });
      canvas.addEventListener("dblclick", onDblClick);
      canvas.addEventListener("contextmenu", onContextMenu);
      document.addEventListener("keydown", onKeyDown);
    },

    detach(): void {
      if (!canvas) return;
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("dblclick", onDblClick);
      canvas.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
      canvas = null;
      machine.reset();
    },

    onAction(cb: (action: InputAction) => void): void {
      callback = cb;
    },

    getDragState() {
      return machine.getState();
    },

    setAffordances(_affordances: readonly Affordance[]): void {
      // MVP: 全操作許可、affordance制御は無視
    },

    setConfig(c: Partial<InputConfig>): void {
      Object.assign(config, c);
    },

    setViewport(state: ViewportState): void {
      viewport = state;
    },
  };

  return handler;
}
