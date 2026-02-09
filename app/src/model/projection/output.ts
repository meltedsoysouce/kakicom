import type { ProjectionOutput, Position, Edge, Annotation } from "./types.ts";
import type { NodeId } from "../node/types.ts";

export function emptyOutput(): ProjectionOutput {
  return {
    positions: new Map(),
    edges: [],
    annotations: [],
  };
}

export function setPosition(
  output: ProjectionOutput,
  nodeId: NodeId,
  position: Position,
): ProjectionOutput {
  const newPositions = new Map(output.positions);
  newPositions.set(nodeId, position);
  return { ...output, positions: newPositions };
}

export function addEdge(output: ProjectionOutput, edge: Edge): ProjectionOutput {
  return { ...output, edges: [...output.edges, edge] };
}

export function addAnnotation(
  output: ProjectionOutput,
  annotation: Annotation,
): ProjectionOutput {
  return { ...output, annotations: [...output.annotations, annotation] };
}

export function mergeOutputs(
  a: ProjectionOutput,
  b: ProjectionOutput,
): ProjectionOutput {
  const positions = new Map(a.positions);
  for (const [k, v] of b.positions) {
    positions.set(k, v);
  }
  return {
    positions,
    edges: [...a.edges, ...b.edges],
    annotations: [...a.annotations, ...b.annotations],
  };
}
