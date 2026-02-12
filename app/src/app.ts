import type { NodeId } from "./model/node/index.ts";
import type { EdgeId, Edge } from "./model/edge/index.ts";
import type { Position } from "./model/projection/index.ts";
import type {
  Camera,
  CanvasSize,
  ViewportState,
  WorldPoint,
} from "./canvas/viewport/index.ts";
import type { InputAction } from "./canvas/input/index.ts";
import type { RenderScene, RenderableNode, RenderableEdge } from "./canvas/renderer/index.ts";
import type { EventStore, NodeSnapshot, PersistedNodeRecord, PersistedEdgeRecord } from "./storage/event-store/index.ts";
import {
  collectExportData,
  serializeToJson,
  parseExportJson,
  importExportData,
  saveFile,
  loadFile,
} from "./storage/file-port/index.ts";

import { createNode, updateNode, now } from "./model/node/index.ts";
import { extractText } from "./model/node/index.ts";
import { createEdge } from "./model/edge/index.ts";
import {
  defaultCamera,
  panByScreenDelta,
  zoomByWheel,
  measureCanvasSize,
  applyCanvasSize,
} from "./canvas/viewport/index.ts";
import { createRenderer, toRenderableNode, toRenderableEdge, STATIONERY_THEME, applyThemeToCss } from "./canvas/renderer/index.ts";
import { createHitTester, buildHitTestableScene } from "./canvas/hit-test/index.ts";
import { createInputHandler } from "./canvas/input/index.ts";
import { createTextEditor } from "./text-editor.ts";

type LinkModeState =
  | { type: "inactive" }
  | { type: "selecting_source" }
  | { type: "selecting_target"; sourceNodeId: NodeId };

interface AppState {
  camera: Camera;
  canvasSize: CanvasSize;
  nodes: Map<NodeId, NodeSnapshot>;
  positions: Map<NodeId, Position>;
  edges: Map<EdgeId, Edge>;
  selectedNodeId: NodeId | null;
  selectedEdgeId: EdgeId | null;
  linkMode: LinkModeState;
}

export interface App {
  start(): void;
  resize(): void;
  exportToFile(): Promise<void>;
  importFromFile(): Promise<void>;
}

export function createApp(params: {
  canvas: HTMLCanvasElement;
  container: HTMLDivElement;
  eventStore: EventStore;
  initialRecords: readonly PersistedNodeRecord[];
  initialEdges: readonly PersistedEdgeRecord[];
}): App {
  const { canvas, container, eventStore } = params;

  // ── State ──

  const state: AppState = {
    camera: defaultCamera(),
    canvasSize: measureCanvasSize(canvas),
    nodes: new Map(),
    positions: new Map(),
    edges: new Map(),
    selectedNodeId: null,
    selectedEdgeId: null,
    linkMode: { type: "inactive" },
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

  // 読み込んだEdgeを復元
  for (const record of params.initialEdges) {
    const edge: Edge = {
      id: record.id,
      sourceNodeId: record.sourceNodeId,
      targetNodeId: record.targetNodeId,
      relation: record.relation,
      label: record.label,
      createdAt: record.createdAt,
    };
    state.edges.set(edge.id, edge);
  }

  // ── Components ──

  function getViewport(): ViewportState {
    return { camera: state.camera, canvasSize: state.canvasSize };
  }

  const renderer = createRenderer({ theme: STATIONERY_THEME });
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

    const renderableEdges: RenderableEdge[] = [];
    for (const [edgeId, edge] of state.edges) {
      const srcPos = state.positions.get(edge.sourceNodeId);
      const tgtPos = state.positions.get(edge.targetNodeId);
      if (!srcPos || !tgtPos) continue;
      renderableEdges.push(
        toRenderableEdge({
          edge,
          sourcePosition: { wx: srcPos.x, wy: srcPos.y },
          targetPosition: { wx: tgtPos.x, wy: tgtPos.y },
          selected: edgeId === state.selectedEdgeId,
        }),
      );
    }

    const scene: RenderScene = {
      nodes: renderableNodes,
      edges: renderableEdges,
      annotations: [],
      background: "dot_grid",
    };

    renderer.setScene(scene);
    renderer.requestRedraw();

    hitTester.setScene(buildHitTestableScene(renderableNodes, renderableEdges));
  }

  // ── Link Mode ──

  function updateCursor(): void {
    canvas.style.cursor = state.linkMode.type !== "inactive" ? "crosshair" : "";
  }

  function toggleLinkMode(): void {
    if (state.linkMode.type !== "inactive") {
      state.linkMode = { type: "inactive" };
    } else {
      state.linkMode = { type: "selecting_source" };
    }
    updateCursor();
    rebuildScene();
  }

  function cancelLinkMode(): void {
    if (state.linkMode.type === "inactive") return;
    state.linkMode = { type: "inactive" };
    updateCursor();
    rebuildScene();
  }

  async function handleLinkModeNodeClick(nodeId: NodeId): Promise<void> {
    if (state.linkMode.type === "selecting_source") {
      state.linkMode = { type: "selecting_target", sourceNodeId: nodeId };
      state.selectedNodeId = nodeId;
      rebuildScene();
    } else if (state.linkMode.type === "selecting_target") {
      const sourceNodeId = state.linkMode.sourceNodeId;
      if (nodeId === sourceNodeId) {
        // 同じNodeクリック → キャンセル
        cancelLinkMode();
        return;
      }
      // Edge作成
      const edge = createEdge({ sourceNodeId, targetNodeId: nodeId });
      state.edges.set(edge.id, edge);
      await eventStore.saveEdge(edge);
      state.linkMode = { type: "inactive" };
      state.selectedNodeId = null;
      state.selectedEdgeId = edge.id;
      updateCursor();
      rebuildScene();
    }
  }

  // ── Edge Operations ──

  async function deleteSelectedEdge(): Promise<void> {
    if (!state.selectedEdgeId) return;
    const edgeId = state.selectedEdgeId;
    state.edges.delete(edgeId);
    state.selectedEdgeId = null;
    await eventStore.deleteEdge(edgeId);
    rebuildScene();
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
        if (state.linkMode.type !== "inactive") {
          cancelLinkMode();
        } else {
          createNewNode(action.worldPoint);
        }
        break;

      case "background_click":
        if (state.linkMode.type !== "inactive") {
          cancelLinkMode();
        } else {
          state.selectedNodeId = null;
          state.selectedEdgeId = null;
          rebuildScene();
        }
        break;

      case "node_click":
        if (state.linkMode.type !== "inactive") {
          handleLinkModeNodeClick(action.nodeId);
        } else {
          state.selectedNodeId = action.nodeId;
          state.selectedEdgeId = null;
          rebuildScene();
        }
        break;

      case "edge_click":
        if (state.linkMode.type !== "inactive") {
          cancelLinkMode();
        } else {
          state.selectedEdgeId = action.edgeId;
          state.selectedNodeId = null;
          rebuildScene();
        }
        break;

      case "node_double_click": {
        if (state.linkMode.type !== "inactive") {
          cancelLinkMode();
          break;
        }
        const snapshot = state.nodes.get(action.nodeId);
        const currentText = snapshot ? extractText(snapshot.node.payload) : "";
        textEditor.open(action.nodeId, action.worldPoint, currentText);
        break;
      }

      case "node_drag_start":
        if (state.linkMode.type !== "inactive") break;
        state.selectedNodeId = action.nodeId;
        state.selectedEdgeId = null;
        rebuildScene();
        break;

      case "node_drag_move":
        if (state.linkMode.type !== "inactive") break;
        moveNode(action.nodeId, action.deltaWorldX, action.deltaWorldY);
        break;

      case "node_drag_end":
        if (state.linkMode.type !== "inactive") break;
        saveNodePosition(action.nodeId);
        break;

      case "key":
        if (action.key === "l" || action.key === "L") {
          toggleLinkMode();
        }
        if (action.key === "Escape") {
          if (state.linkMode.type !== "inactive") {
            cancelLinkMode();
          } else {
            state.selectedNodeId = null;
            state.selectedEdgeId = null;
            rebuildScene();
          }
        }
        if (action.key === "Delete" || action.key === "Backspace") {
          if (state.selectedEdgeId) {
            deleteSelectedEdge();
          }
        }
        break;
    }
  }

  // ── Export / Import ──

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
      if (content === null) return;

      const result = parseExportJson(content);
      if (!result.ok) {
        console.error("[kakicom] import validation failed:", result.errors);
        return;
      }

      const importResult = await importExportData(eventStore, result.data, "replace");
      console.log(
        `[kakicom] imported: ${importResult.nodesImported} nodes, ${importResult.edgesImported} edges`,
      );

      window.location.reload();
    } catch (err) {
      console.error("[kakicom] import failed:", err);
    }
  }

  // ── Public API ──

  return {
    start(): void {
      // テーマのCSS反映（Canvas外UI要素にも配色を適用）
      applyThemeToCss(STATIONERY_THEME);

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

      // Export / Import キーボードショートカット
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

    exportToFile: handleExport,
    importFromFile: handleImport,
  };
}
