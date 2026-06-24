// simulation/DensitySweep.ts

import { runMonteCarlo } from "./MonteCarloRunner.js";
import type { SimulationState } from "../core/Types.js";

export interface DensitySweepResult {
  densityMultiplier: number;
  runs: number;
  cascades: number;
  probability: number;
}

function buildInitialState(
  densityMultiplier: number,
): SimulationState {
  return {
    populations: {
      A: {
        sa: Math.round(5000 * densityMultiplier),
        sd: Math.round(5000 * densityMultiplier),
        d: Math.round(50000 * densityMultiplier),
      },

      B: {
        sa: Math.round(5000 * densityMultiplier),
        sd: Math.round(5000 * densityMultiplier),
        d: Math.round(50000 * densityMultiplier),
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

export function runDensitySweep(): DensitySweepResult[] {
  const results: DensitySweepResult[] = [];

  const RUNS_PER_POINT = 200;

  for (
    let densityMultiplier = 0.085;
    densityMultiplier <= 0.11;
    densityMultiplier += 0.0025
  ) {
    let cascades = 0;

    for (let run = 0; run < RUNS_PER_POINT; run++) {
      const initialState =
        buildInitialState(densityMultiplier);

      const result =
        runMonteCarlo(initialState);

      if (result.cascade) {
        cascades++;
      }
    }

    const probability =
      cascades / RUNS_PER_POINT;

    const row: DensitySweepResult = {
      densityMultiplier:
        Number(densityMultiplier.toFixed(4)),
      runs: RUNS_PER_POINT,
      cascades,
      probability,
    };

    results.push(row);

    console.log(
      `Density ${row.densityMultiplier.toFixed(4)} | ` +
      `${row.cascades}/${row.runs} cascades | ` +
      `P=${row.probability.toFixed(3)}`
    );
  }

  return results;
}