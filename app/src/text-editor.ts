import type { NodeId } from "./model/node/index.ts";
import type { ViewportState, WorldPoint } from "./canvas/viewport/index.ts";
import { worldToScreen } from "./canvas/viewport/index.ts";

/**
 * Canvas上のNode編集用HTMLテキストエリアオーバーレイ。
 */
export interface TextEditor {
  open(nodeId: NodeId, worldPoint: WorldPoint, currentText: string): void;
  close(): void;
  isOpen(): boolean;
}

/**
 * TextEditorを生成する。
 *
 * ダブルクリック時にtextareaを表示し、
 * Enter（確定）/ Escape（キャンセル）/ blur（確定）で閉じる。
 */
export function createTextEditor(params: {
  container: HTMLElement;
  getViewport: () => ViewportState;
  onCommit: (nodeId: NodeId, text: string) => void;
}): TextEditor {
  let textarea: HTMLTextAreaElement | null = null;
  let editingNodeId: NodeId | null = null;

  function commit(): void {
    if (!textarea || !editingNodeId) return;
    const text = textarea.value;
    const nodeId = editingNodeId;
    textarea.remove();
    textarea = null;
    editingNodeId = null;
    params.onCommit(nodeId, text);
  }

  function cancel(): void {
    if (textarea) {
      textarea.remove();
      textarea = null;
      editingNodeId = null;
    }
  }

  return {
    open(nodeId: NodeId, worldPoint: WorldPoint, currentText: string): void {
      // 既存の編集をコミット
      if (textarea) {
        commit();
      }

      editingNodeId = nodeId;

      textarea = document.createElement("textarea");
      textarea.className = "node-text-editor";

      // ワールド座標 → スクリーン座標でポジショニング
      const viewport = params.getViewport();
      const screen = worldToScreen(viewport, worldPoint);
      textarea.style.left = `${screen.sx - 60}px`;
      textarea.style.top = `${screen.sy - 24}px`;
      textarea.style.width = "200px";
      textarea.style.minHeight = "48px";

      textarea.value = currentText;

      params.container.appendChild(textarea);
      textarea.focus();

      // Enterで確定（Shift+Enterで改行）、Escapeでキャンセル
      textarea.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          commit();
        }
        if (e.key === "Escape") {
          cancel();
        }
      });

      // フォーカス喪失で確定
      textarea.addEventListener("blur", () => {
        commit();
      });
    },

    close(): void {
      cancel();
    },

    isOpen(): boolean {
      return textarea !== null;
    },
  };
}
