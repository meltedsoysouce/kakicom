import type { NodeId } from "./model/node/index.ts";
import type { Position } from "./model/projection/index.ts";
import type {
  Camera,
  CanvasSize,
  ViewportState,
  WorldPoint,
} from "./canvas/viewport/index.ts";
import type { InputAction } from "./canvas/input/index.ts";
import type { RenderScene, RenderableNode } from "./canvas/renderer/index.ts";
import type { EventStore, NodeSnapshot, PersistedNodeRecord } from "./storage/event-store/index.ts";

import { createNode, updateNode, now } from "./model/node/index.ts";
import { extractText } from "./model/node/index.ts";
import {
  defaultCamera,
  panByScreenDelta,
  zoomByWheel,
  measureCanvasSize,
  applyCanvasSize,
} from "./canvas/viewport/index.ts";
import { createRenderer, toRenderableNode, DARK_THEME } from "./canvas/renderer/index.ts";
import { createHitTester, buildHitTestableScene } from "./canvas/hit-test/index.ts";
import { createInputHandler } from "./canvas/input/index.ts";
import { createTextEditor } from "./text-editor.ts";

interface AppState {
  camera: Camera;
  canvasSize: CanvasSize;
  nodes: Map<NodeId, NodeSnapshot>;
  positions: Map<NodeId, Position>;
  selectedNodeId: NodeId | null;
}

export interface App {
  start(): void;
  resize(): void;
}

export function createApp(params: {
  canvas: HTMLCanvasElement;
  container: HTMLDivElement;
  eventStore: EventStore;
  initialRecords: readonly PersistedNodeRecord[];
}): App {
  const { canvas, container, eventStore } = params;

  // ── State ──

  const state: AppState = {
    camera: defaultCamera(),
    canvasSize: measureCanvasSize(canvas),
    nodes: new Map(),
    positions: new Map(),
    selectedNodeId: null,
  };

  // 読み込んだNodeを復元
  for (const record of params.initialRecords) {
    const nodeId = record.node.id;
    const snapshot: NodeSnapshot = {
      node: record.node,
      dormancyState: record.dormancyState,
      updatedAt: record.updatedAt,
    };
    state.nodes.set(nodeId, snapshot);
    if (record.position) {
      state.positions.set(nodeId, record.position);
    }
  }

  // ── Components ──

  function getViewport(): ViewportState {
    return { camera: state.camera, canvasSize: state.canvasSize };
  }

  const renderer = createRenderer({ theme: DARK_THEME });
  const hitTester = createHitTester();
  const inputHandler = createInputHandler({
    viewport: getViewport(),
    hitTester,
  });

  const textEditor = createTextEditor({
    container,
    getViewport,
    onCommit(nodeId: NodeId, text: string) {
      commitNodeText(nodeId, text);
    },
  });

  // ── Viewport Update ──

  function updateViewport(): void {
    const vp = getViewport();
    renderer.setViewport(vp);
    inputHandler.setViewport(vp);
    rebuildScene();
  }

  // ── Scene Rebuild ──

  function rebuildScene(): void {
    const renderableNodes: RenderableNode[] = [];

    for (const [nodeId, snapshot] of state.nodes) {
      const position = state.positions.get(nodeId);
      if (!position) continue;

      renderableNodes.push(
        toRenderableNode({
          node: snapshot.node,
          position: { wx: position.x, wy: position.y },
          dormancyState: snapshot.dormancyState,
          selected: nodeId === state.selectedNodeId,
          hovered: false,
        }),
      );
    }

    const scene: RenderScene = {
      nodes: renderableNodes,
      edges: [],
      annotations: [],
      background: "dot_grid",
    };

    renderer.setScene(scene);
    renderer.requestRedraw();

    hitTester.setScene(buildHitTestableScene(renderableNodes));
  }

  // ── Node Operations ──

  async function createNewNode(worldPoint: WorldPoint): Promise<void> {
    const node = createNode({ payload: { type: "text", text: "" } });
    const position: Position = { x: worldPoint.wx, y: worldPoint.wy };
    state.positions.set(node.id, position);

    const snapshot: NodeSnapshot = {
      node,
      dormancyState: "active",
      updatedAt: now(),
    };
    state.nodes.set(node.id, snapshot);

    await eventStore.saveNode(snapshot, position);

    rebuildScene();

    // 即座にテキスト編集モードへ
    textEditor.open(node.id, worldPoint, "");
  }

  function moveNode(nodeId: NodeId, dx: number, dy: number): void {
    const pos = state.positions.get(nodeId);
    if (!pos) return;
    state.positions.set(nodeId, { x: pos.x + dx, y: pos.y + dy });
    rebuildScene();
  }

  async function saveNodePosition(nodeId: NodeId): Promise<void> {
    const snapshot = state.nodes.get(nodeId);
    const position = state.positions.get(nodeId);
    if (!snapshot || !position) return;
    await eventStore.saveNode(snapshot, position);
  }

  async function commitNodeText(nodeId: NodeId, text: string): Promise<void> {
    const snapshot = state.nodes.get(nodeId);
    if (!snapshot) return;

    const updatedNode = updateNode(snapshot.node, {
      payload: { type: "text", text },
    });
    const updatedSnapshot: NodeSnapshot = {
      node: updatedNode,
      dormancyState: snapshot.dormancyState,
      updatedAt: now(),
    };
    state.nodes.set(nodeId, updatedSnapshot);

    const position = state.positions.get(nodeId);
    await eventStore.saveNode(updatedSnapshot, position);

    rebuildScene();
  }

  // ── Action Handling ──

  function handleAction(action: InputAction): void {
    // テキスト編集中はinputを無視
    if (textEditor.isOpen()) return;

    switch (action.type) {
      case "pan":
        state.camera = panByScreenDelta(state.camera, action.deltaScreenX, action.deltaScreenY);
        updateViewport();
        break;

      case "pan_end":
        break;

      case "zoom":
        state.camera = zoomByWheel(
          state.camera,
          state.canvasSize,
          action.focusScreen,
          action.delta,
        );
        updateViewport();
        break;

      case "background_double_click":
        createNewNode(action.worldPoint);
        break;

      case "background_click":
        state.selectedNodeId = null;
        rebuildScene();
        break;

      case "node_click":
        state.selectedNodeId = action.nodeId;
        rebuildScene();
        break;

      case "node_double_click": {
        const snapshot = state.nodes.get(action.nodeId);
        const currentText = snapshot ? extractText(snapshot.node.payload) : "";
        textEditor.open(action.nodeId, action.worldPoint, currentText);
        break;
      }

      case "node_drag_start":
        state.selectedNodeId = action.nodeId;
        rebuildScene();
        break;

      case "node_drag_move":
        moveNode(action.nodeId, action.deltaWorldX, action.deltaWorldY);
        break;

      case "node_drag_end":
        saveNodePosition(action.nodeId);
        break;
    }
  }

  // ── Public API ──

  return {
    start(): void {
      // Canvas初期化
      const size = measureCanvasSize(canvas);
      state.canvasSize = size;
      applyCanvasSize(canvas, size);

      // Renderer初期化・開始
      renderer.init(canvas);
      renderer.resize(size);
      renderer.setViewport(getViewport());
      renderer.start();

      // Input初期化
      inputHandler.setViewport(getViewport());
      inputHandler.attach(canvas);
      inputHandler.onAction(handleAction);

      // 初回描画
      rebuildScene();
    },

    resize(): void {
      const size = measureCanvasSize(canvas);
      state.canvasSize = size;
      applyCanvasSize(canvas, size);
      renderer.resize(size);
      updateViewport();
    },
  };
}
