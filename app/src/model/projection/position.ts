import type { Position } from "./types.ts";

export function distance(a: Position, b: Position): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function translate(pos: Position, dx: number, dy: number): Position {
  return { x: pos.x + dx, y: pos.y + dy };
}

export function centroid(positions: readonly Position[]): Position {
  if (positions.length === 0) return { x: 0, y: 0 };
  const sum = positions.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 },
  );
  return { x: sum.x / positions.length, y: sum.y / positions.length };
}
