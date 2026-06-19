// simulation/MonteCarloRunner.ts

import type {
  SimulationState,
  RunResult,
} from "../core/Types.js";

import { computeCollisionRates } from "../physics/CollisionEngine.js";
import { sampleCollisionCounts } from "../physics/CollisionSampler.js";
import {
  applyFragmentation,
} from "../physics/FragmentationEngine.js";

import {
  applyDecay,
  type DecayParameters,
} from "../physics/DecayEngine.js";

const DEFAULT_DECAY_PARAMS: DecayParameters = {
  tauA: 5,
  tauB: 100,
  activeFailureRate: 0.05,
};

const MAX_STEPS = 2400;

function isCascade(state: SimulationState): boolean {
  const debrisA = state.populations.A.d;
  const debrisB = state.populations.B.d;

  return debrisA >= 100_000 || debrisB >= 100_000;
}

function isExtinct(state: SimulationState): boolean {
  const totalA =
    state.populations.A.sa +
    state.populations.A.sd +
    state.populations.A.d;

  const totalB =
    state.populations.B.sa +
    state.populations.B.sd +
    state.populations.B.d;

  return totalA === 0 && totalB === 0;
}

export function runMonteCarlo(
  initialState: SimulationState,
  decayParams: DecayParameters = DEFAULT_DECAY_PARAMS,
): RunResult {
  let state: SimulationState = structuredClone(initialState);

  for (let step = 0; step < MAX_STEPS; step++) {
    const rates = computeCollisionRates(state);
    if (step === 0) {
  console.log("STEP0 RATES", rates);
}

    const collisions = sampleCollisionCounts(
      rates,
      state.dt,
    );
    if (step === 0) {
      console.log("STEP0 COLLISIONS", collisions);
    }

    const fragmentation = applyFragmentation(
      state,
      collisions,
    );

    state = fragmentation.state;

    const decay = applyDecay(
      state,
      decayParams,
    );

    state = decay.state;

    state.stepIndex += 1;

    if (isCascade(state)) {
      return {
        cascade: true,
        terminated: true,
        terminationReason: "CASCADE",
        finalState: state,
      };
    }

    if (isExtinct(state)) {
      return {
        cascade: false,
        terminated: true,
        terminationReason: "EXTINCTION",
        finalState: state,
      };
    }
  }

  return {
    cascade: false,
    terminated: true,
    terminationReason: "MAX_STEPS",
    finalState: state,
  };
}