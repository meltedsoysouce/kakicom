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

/**
 * 高級文具テーマ。
 * クリーム色の紙に万年筆のインクで書くような配色。
 */
export const STATIONERY_THEME: RenderTheme = {
  background: "#faf6ef",           // クリーム色の上質紙
  gridColor: "#c4b8a8",            // 鉛筆のようなグリッドドット
  gridOpacity: 0.25,
  nodeDefaults: {
    fillColor: "#fef3c0",           // やわらかい黄色の付箋
    strokeColor: "#d4c48a",         // 金色がかった縁
    strokeWidth: 1.5,
    cornerRadius: 8,
    fontSize: 14,
    fontFamily: "system-ui, sans-serif",
    textColor: "#3c3022",           // 万年筆の濃茶インク
    padding: 12,
    minWidth: 120,
    minHeight: 48,
  },
  edgeDefaults: {
    strokeColor: "#8b7355",         // 温かみのある茶系の線
    strokeWidth: 1,
    arrowSize: 8,
    labelFontSize: 11,
    labelColor: "#6b5b47",          // 落ち着いたラベル色
  },
  annotationDefaults: {
    badgeSize: 16,
    badgeColor: "#b03a2e",          // 封蝋のような赤
    fontSize: 10,
    fontColor: "#fff",
  },
  selectionColor: "#1a5276",        // 万年筆ブルーブラックインク
  hoverColor: "#1a527640",
};

/**
 * RenderThemeの配色をCSSカスタムプロパティとしてdocument.documentElementに反映する。
 * style.css側で var(--kakicom-*) として参照し、Canvas外のUI要素にもテーマを適用する。
 *
 * 将来的にテーマをJSON等の外部ファイルから読み込む場合も、
 * RenderThemeオブジェクトを構築してこの関数を呼べばCSS側も自動で追従する。
 */
export function applyThemeToCss(theme: RenderTheme): void {
  const s = document.documentElement.style;
  s.setProperty("--kakicom-background", theme.background);
  s.setProperty("--kakicom-node-fill", theme.nodeDefaults.fillColor);
  s.setProperty("--kakicom-node-stroke", theme.nodeDefaults.strokeColor);
  s.setProperty("--kakicom-node-text", theme.nodeDefaults.textColor);
  s.setProperty("--kakicom-node-font-size", `${theme.nodeDefaults.fontSize}px`);
  s.setProperty("--kakicom-node-font-family", theme.nodeDefaults.fontFamily);
  s.setProperty("--kakicom-node-radius", `${theme.nodeDefaults.cornerRadius}px`);
  s.setProperty("--kakicom-node-padding", `${theme.nodeDefaults.padding}px`);
  s.setProperty("--kakicom-selection", theme.selectionColor);
  s.setProperty("--kakicom-hover", theme.hoverColor);
}
