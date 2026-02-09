import type { EpistemicState } from "./types.ts";

const WEIGHTS: Record<EpistemicState, number> = {
  certain: 4,
  likely: 3,
  hypothesis: 2,
  speculative: 1,
  unsure: 0,
};

export function epistemicWeight(state: EpistemicState): number {
  return WEIGHTS[state];
}

export function higherEpistemic(a: EpistemicState, b: EpistemicState): EpistemicState {
  return epistemicWeight(a) >= epistemicWeight(b) ? a : b;
}
