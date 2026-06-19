// physics/DecayEngine.ts

import type { SimulationState } from "../core/Types.js";

export interface DecayParameters {
  tauA: number; // Shell A harmonic lifetime [yr]
  tauB: number; // Shell B harmonic lifetime [yr]

  activeFailureRate: number; // failures per year
}

export interface DecayResult {
  state: SimulationState;

  debrisRemovedA: number;
  debrisRemovedB: number;

  activeFailuresA: number;
  activeFailuresB: number;
}

/**
 * Binomial sampler using Bernoulli trials.
 *
 * Adequate for current simulation sizes.
 */
export function sampleBinomial(
  n: number,
  p: number,
): number {
  if (n <= 0) return 0;
  if (p <= 0) return 0;
  if (p >= 1) return n;

  let successes = 0;

  for (let i = 0; i < n; i++) {
    if (Math.random() < p) {
      successes++;
    }
  }

  return successes;
}

/**
 * Per-step decay probability:
 *
 * p = 1 - exp(-dt / tau)
 */
function decayProbability(
  dt: number,
  tau: number,
): number {
  return 1 - Math.exp(-dt / tau);
}

/**
 * Per-step active satellite failure probability.
 */
function failureProbability(
  dt: number,
  annualRate: number,
): number {
  return 1 - Math.exp(-annualRate * dt);
}

export function applyDecay(
  state: SimulationState,
  params: DecayParameters,
): DecayResult {
  const next: SimulationState = structuredClone(state);

  const dt = state.dt;

  const pDecayA = decayProbability(dt, params.tauA);
  const pDecayB = decayProbability(dt, params.tauB);

  const pFailure = failureProbability(
    dt,
    params.activeFailureRate,
  );

  const A = next.populations.A;
  const B = next.populations.B;

  //
  // Debris drag decay
  //

  const debrisRemovedA = sampleBinomial(
    A.d,
    pDecayA,
  );

  const debrisRemovedB = sampleBinomial(
    B.d,
    pDecayB,
  );

  A.d -= debrisRemovedA;
  B.d -= debrisRemovedB;

  //
  // Active → Defunct transition
  //

  const activeFailuresA = sampleBinomial(
    A.sa,
    pFailure,
  );

  const activeFailuresB = sampleBinomial(
    B.sa,
    pFailure,
  );

  A.sa -= activeFailuresA;
  A.sd += activeFailuresA;

  B.sa -= activeFailuresB;
  B.sd += activeFailuresB;

  return {
    state: next,

    debrisRemovedA,
    debrisRemovedB,

    activeFailuresA,
    activeFailuresB,
  };
}

/**
 * Default parameters from the paper.
 *
 * Harmonic mean lifetimes:
 *
 * Shell A:
 *   τ_h ≈ 5 yr
 *
 * Shell B:
 *   τ_h ≈ 100 yr
 *
 * Active failure:
 *   2% per year
 */
export const DEFAULT_DECAY_PARAMETERS: DecayParameters = {
  tauA: 5,
  tauB: 100,

  activeFailureRate: 0.02,
};