// core/SimulationState.ts

import type { SimulationState as State } from "./Types.js";

export function createEmptyState(): State {
  return {
    populations: {
      A: {
        sa: 0,
        sd: 0,
        d: 0,
      },

      B: {
        sa: 0,
        sd: 0,
        d: 0,
      },
    },

    params: {
      pAvoid: 0.9,
    },

    stepIndex: 0,

    dt: 1 / 12,

    refinementDepth: 0,
  };
}

export function totalPopulationA(state: State): number {
  const A = state.populations.A;

  return A.sa + A.sd + A.d;
}

export function totalPopulationB(state: State): number {
  const B = state.populations.B;

  return B.sa + B.sd + B.d;
}