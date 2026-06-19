// physics/FragmentationEngine.ts

import type { SimulationState } from "../core/Types.js";

/**
 * Mean fragment yields from Phase 4.
 */
export const FRAGMENT_YIELDS = {
  aa: 542,
  ad: 755,
  af: 288,
  dd: 912,
  df: 543,
  ff: 0.47,
} as const;

export interface CollisionCounts {
  aaA: number;
  adA: number;
  afA: number;
  ddA: number;
  dfA: number;
  ffA: number;

  aaB: number;
  adB: number;
  afB: number;
  ddB: number;
  dfB: number;
  ffB: number;
}

/**
 * Knuth Poisson sampler.
 *
 * Suitable for current project scale.
 */
export function samplePoisson(mean: number): number {
  if (mean <= 0) return 0;

  // Knuth for small λ
  if (mean < 30) {
    const L = Math.exp(-mean);

    let k = 0;
    let p = 1;

    do {
      k++;
      p *= Math.random();
    } while (p > L);

    return k - 1;
  }

  // Normal approximation for large λ
  const u1 = Math.random();
  const u2 = Math.random();

  const z =
    Math.sqrt(-2 * Math.log(u1)) *
    Math.cos(2 * Math.PI * u2);

  return Math.max(
    0,
    Math.round(mean + Math.sqrt(mean) * z),
  );
}

function sampleFragments(
  collisionCount: number,
  meanFragments: number,
): number {
  let total = 0;

  for (let i = 0; i < collisionCount; i++) {
    total += samplePoisson(meanFragments);
  }

  return total;
}

export interface FragmentationResult {
  state: SimulationState;

  fragmentsCreatedA: number;
  fragmentsCreatedB: number;

  collisionsProcessed: number;
}

export function applyFragmentation(
  state: SimulationState,
  collisions: CollisionCounts,
): FragmentationResult {
  const next: SimulationState = structuredClone(state);

  let fragmentsCreatedA = 0;
  let fragmentsCreatedB = 0;

  let collisionsProcessed = 0;

  //
  // SHELL A
  //

  const A = next.populations.A;

  collisionsProcessed +=
    collisions.aaA +
    collisions.adA +
    collisions.afA +
    collisions.ddA +
    collisions.dfA +
    collisions.ffA;

  // AA

  if (collisions.aaA > 0) {
    A.sa = Math.max(0, A.sa - 2 * collisions.aaA);

    const fragments = sampleFragments(
      collisions.aaA,
      FRAGMENT_YIELDS.aa,
    );

    A.d += fragments;
    fragmentsCreatedA += fragments;
  }

  // AD

  if (collisions.adA > 0) {
    A.sa = Math.max(0, A.sa - collisions.adA);
    A.sd = Math.max(0, A.sd - collisions.adA);

    const fragments = sampleFragments(
      collisions.adA,
      FRAGMENT_YIELDS.ad,
    );

    A.d += fragments;
    fragmentsCreatedA += fragments;
  }

  // AF

  if (collisions.afA > 0) {
    A.sa = Math.max(0, A.sa - collisions.afA);

    const fragments = sampleFragments(
      collisions.afA,
      FRAGMENT_YIELDS.af,
    );

    A.d += fragments;
    fragmentsCreatedA += fragments;
  }

  // DD

  if (collisions.ddA > 0) {
    A.sd = Math.max(0, A.sd - 2 * collisions.ddA);

    const fragments = sampleFragments(
      collisions.ddA,
      FRAGMENT_YIELDS.dd,
    );

    A.d += fragments;
    fragmentsCreatedA += fragments;
  }

  // DF

  if (collisions.dfA > 0) {
    A.sd = Math.max(0, A.sd - collisions.dfA);

    const fragments = sampleFragments(
      collisions.dfA,
      FRAGMENT_YIELDS.df,
    );

    A.d += fragments;
    fragmentsCreatedA += fragments;
  }

  // FF

  if (collisions.ffA > 0) {
    const fragments = sampleFragments(
      collisions.ffA,
      FRAGMENT_YIELDS.ff,
    );

    A.d += fragments;
    fragmentsCreatedA += fragments;
  }

  //
  // SHELL B
  //

  const B = next.populations.B;

  collisionsProcessed +=
    collisions.aaB +
    collisions.adB +
    collisions.afB +
    collisions.ddB +
    collisions.dfB +
    collisions.ffB;

  // AA

  if (collisions.aaB > 0) {
    B.sa = Math.max(0, B.sa - 2 * collisions.aaB);

    const fragments = sampleFragments(
      collisions.aaB,
      FRAGMENT_YIELDS.aa,
    );

    B.d += fragments;
    fragmentsCreatedB += fragments;
  }

  // AD

  if (collisions.adB > 0) {
    B.sa = Math.max(0, B.sa - collisions.adB);
    B.sd = Math.max(0, B.sd - collisions.adB);

    const fragments = sampleFragments(
      collisions.adB,
      FRAGMENT_YIELDS.ad,
    );

    B.d += fragments;
    fragmentsCreatedB += fragments;
  }

  // AF

  if (collisions.afB > 0) {
    B.sa = Math.max(0, B.sa - collisions.afB);

    const fragments = sampleFragments(
      collisions.afB,
      FRAGMENT_YIELDS.af,
    );

    B.d += fragments;
    fragmentsCreatedB += fragments;
  }

  // DD

  if (collisions.ddB > 0) {
    B.sd = Math.max(0, B.sd - 2 * collisions.ddB);

    const fragments = sampleFragments(
      collisions.ddB,
      FRAGMENT_YIELDS.dd,
    );

    B.d += fragments;
    fragmentsCreatedB += fragments;
  }

  // DF

  if (collisions.dfB > 0) {
    B.sd = Math.max(0, B.sd - collisions.dfB);

    const fragments = sampleFragments(
      collisions.dfB,
      FRAGMENT_YIELDS.df,
    );

    B.d += fragments;
    fragmentsCreatedB += fragments;
  }

  // FF

  if (collisions.ffB > 0) {
    const fragments = sampleFragments(
      collisions.ffB,
      FRAGMENT_YIELDS.ff,
    );

    B.d += fragments;
    fragmentsCreatedB += fragments;
  }

  return {
    state: next,
    fragmentsCreatedA,
    fragmentsCreatedB,
    collisionsProcessed,
  };
}