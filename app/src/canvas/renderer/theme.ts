import type { RenderTheme } from "./types.ts";

export const DARK_THEME: RenderTheme = {
  background: "#1a1a2e",
  gridColor: "#ffffff",
  gridOpacity: 0.15,
  nodeDefaults: {
    fillColor: "#16213e",
    strokeColor: "#0f3460",
    strokeWidth: 1.5,
    cornerRadius: 8,
    fontSize: 14,
    fontFamily: "system-ui, sans-serif",
    textColor: "#e0e0e0",
    padding: 12,
    minWidth: 120,
    minHeight: 48,
  },
  edgeDefaults: {
    strokeColor: "#0f3460",
    strokeWidth: 1,
    arrowSize: 8,
    labelFontSize: 11,
    labelColor: "#999",
  },
  annotationDefaults: {
    badgeSize: 16,
    badgeColor: "#e94560",
    fontSize: 10,
    fontColor: "#fff",
  },
  selectionColor: "#53c2f0",
  hoverColor: "#53c2f080",
};

export const LIGHT_THEME: RenderTheme = {
  background: "#f5f5f5",
  gridColor: "#000000",
  gridOpacity: 0.1,
  nodeDefaults: {
    fillColor: "#ffffff",
    strokeColor: "#cccccc",
    strokeWidth: 1.5,
    cornerRadius: 8,
    fontSize: 14,
    fontFamily: "system-ui, sans-serif",
    textColor: "#333333",
    padding: 12,
    minWidth: 120,
    minHeight: 48,
  },
  edgeDefaults: {
    strokeColor: "#999",
    strokeWidth: 1,
    arrowSize: 8,
    labelFontSize: 11,
    labelColor: "#666",
  },
  annotationDefaults: {
    badgeSize: 16,
    badgeColor: "#e94560",
    fontSize: 10,
    fontColor: "#fff",
  },
  selectionColor: "#2196f3",
  hoverColor: "#2196f380",
};
