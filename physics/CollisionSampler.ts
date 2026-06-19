// physics/CollisionSampler.ts

import type { CollisionRates } from "./CollisionEngine.js";
import { samplePoisson } from "./FragmentationEngine.js";

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

export function sampleCollisionCounts(
  rates: CollisionRates,
  dt: number
): CollisionCounts {
  return {
    aaA: samplePoisson(rates.lambdaAA_A * dt),
    adA: samplePoisson(rates.lambdaAD_A * dt),
    afA: samplePoisson(rates.lambdaAF_A * dt),
    ddA: samplePoisson(rates.lambdaDD_A * dt),
    dfA: samplePoisson(rates.lambdaDF_A * dt),
    ffA: samplePoisson(rates.lambdaFF_A * dt),

    aaB: samplePoisson(rates.lambdaAA_B * dt),
    adB: samplePoisson(rates.lambdaAD_B * dt),
    afB: samplePoisson(rates.lambdaAF_B * dt),
    ddB: samplePoisson(rates.lambdaDD_B * dt),
    dfB: samplePoisson(rates.lambdaDF_B * dt),
    ffB: samplePoisson(rates.lambdaFF_B * dt),
  };
}