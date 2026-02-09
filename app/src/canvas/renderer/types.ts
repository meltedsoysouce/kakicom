import type { ViewportState, WorldPoint, CanvasSize } from "../viewport/index.ts";
import type { NodeId, Payload, NodeKind, EpistemicState } from "../../model/node/index.ts";
import type { EdgeRelation, AnnotationKind } from "../../model/projection/index.ts";
import type { DormancyState } from "../../model/meta/index.ts";
import type { BackgroundStyle } from "../../model/view/index.ts";

/**
 * 描画に必要な全コンテキストを統合したオブジェクト。
 * 毎フレームの描画関数に渡す。
 */
export interface RenderContext {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly viewportState: ViewportState;
  readonly theme: RenderTheme;
}

/**
 * 描画のテーマ（色・フォント・線幅等）。
 */
export interface RenderTheme {
  readonly background: string;
  readonly gridColor: string;
  readonly gridOpacity: number;
  readonly nodeDefaults: NodeStyle;
  readonly edgeDefaults: EdgeStyle;
  readonly annotationDefaults: AnnotationStyle;
  readonly selectionColor: string;
  readonly hoverColor: string;
}

/**
 * Nodeの描画スタイル。
 * EpistemicState / DormancyState に応じて動的に調整される。
 */
export interface NodeStyle {
  readonly fillColor: string;
  readonly strokeColor: string;
  readonly strokeWidth: number;
  readonly cornerRadius: number;
  readonly fontSize: number;
  readonly fontFamily: string;
  readonly textColor: string;
  readonly padding: number;
  readonly minWidth: number;
  readonly minHeight: number;
}

/**
 * EpistemicState → 視覚的パラメータのマッピング。
 */
export interface EpistemicVisualMap {
  readonly certain: EpistemicVisual;
  readonly likely: EpistemicVisual;
  readonly hypothesis: EpistemicVisual;
  readonly speculative: EpistemicVisual;
  readonly unsure: EpistemicVisual;
}

/**
 * EpistemicStateに対応する視覚的調整値。
 */
export interface EpistemicVisual {
  readonly opacity: number;
  readonly strokeDash: readonly number[];
  readonly strokeWidthMultiplier: number;
}

/**
 * DormancyState → 視覚的パラメータのマッピング。
 */
export interface DormancyVisualMap {
  readonly active: DormancyVisual;
  readonly cooling: DormancyVisual;
  readonly dormant: DormancyVisual;
  readonly archived: DormancyVisual;
}

/**
 * DormancyStateに対応する視覚的調整値。
 */
export interface DormancyVisual {
  readonly opacity: number;
  readonly scaleMultiplier: number;
  readonly visible: boolean;
}

/**
 * Edgeの描画スタイル。
 */
export interface EdgeStyle {
  readonly strokeColor: string;
  readonly strokeWidth: number;
  readonly arrowSize: number;
  readonly labelFontSize: number;
  readonly labelColor: string;
}

/**
 * Annotationの描画スタイル。
 */
export interface AnnotationStyle {
  readonly badgeSize: number;
  readonly badgeColor: string;
  readonly fontSize: number;
  readonly fontColor: string;
}

/**
 * 描画に必要なNode情報を統合したデータ。
 * model/のNodeとProjectionOutputのPositionを結合したもの。
 */
export interface RenderableNode {
  readonly id: NodeId;
  readonly payload: Payload;
  readonly kind: NodeKind;
  readonly epistemicState: EpistemicState;
  readonly dormancyState: DormancyState;
  readonly position: WorldPoint;
  readonly size: { readonly width: number; readonly height: number };
  readonly selected: boolean;
  readonly hovered: boolean;
}

/**
 * 描画に必要なEdge情報を統合したデータ。
 */
export interface RenderableEdge {
  readonly sourcePosition: WorldPoint;
  readonly targetPosition: WorldPoint;
  readonly relation: EdgeRelation;
  readonly label: string | null;
  readonly weight: number;
}

/**
 * 描画に必要なAnnotation情報を統合したデータ。
 */
export interface RenderableAnnotation {
  readonly position: WorldPoint;
  readonly kind: AnnotationKind;
  readonly content: string;
}

/**
 * 1フレーム分の描画シーン全体。
 * Rendererはこのデータを受け取って描画する。
 */
export interface RenderScene {
  readonly nodes: readonly RenderableNode[];
  readonly edges: readonly RenderableEdge[];
  readonly annotations: readonly RenderableAnnotation[];
  readonly background: BackgroundStyle;
}

/**
 * 描画パフォーマンス統計。
 */
export interface RenderStats {
  readonly frameTimeMs: number;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly annotationCount: number;
  readonly visibleNodeCount: number;
}

/**
 * Rendererを作成し、Canvas要素にアタッチするインターフェース。
 */
export interface Renderer {
  /** Canvas要素を初期化する（コンテキスト取得、高DPI対応）。 */
  init(canvas: HTMLCanvasElement): void;
  /** 描画ループを開始する。 */
  start(): void;
  /** 描画ループを停止する。 */
  stop(): void;
  /** 再描画をリクエストする（次フレームで描画）。 */
  requestRedraw(): void;
  /** Canvas要素のリサイズ時に呼び出す。 */
  resize(size: CanvasSize): void;
  /** 現在のRenderSceneを設定する。 */
  setScene(scene: RenderScene): void;
  /** 現在のViewportStateを設定する。 */
  setViewport(state: ViewportState): void;
  /** RenderThemeを設定する。 */
  setTheme(theme: RenderTheme): void;
  /** リソースを解放する。 */
  dispose(): void;
}
