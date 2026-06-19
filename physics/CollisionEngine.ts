/**
 * physics/CollisionEngine.ts
 *
 * Computes all twelve per-pair orbital collision rates for Shell A (600 km)
 * and Shell B (850 km) using the composition-dependent cross-section framework
 * derived in the Phase 4 / Phase 5 mathematical architecture.
 *
 * Core formula
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   ω^(c1,c2,k) = f_sym · ε^(c1,c2) · C_k^(c1,c2) · N^(k,c1) · N^(k,c2)
 *
 *   f_sym = 0.5   same-species pairs   (aa, dd, ff)   — prevents double-count
 *         = 1.0   cross-species pairs  (ad, af, df)
 *
 *   ε^(aa) = (1 − P_avoid)²    both parties can manoeuvre
 *   ε^(ad) = ε^(af) = (1 − P_avoid)    only S_a can manoeuvre
 *   ε^(dd) = ε^(df) = ε^(ff) = 1       neither party can manoeuvre
 *
 *   C_k^(c1,c2) = σ^(c1,c2) · v̄_rel^k / V_k   [yr⁻¹]
 *
 * All intermediate geometry is computed in SI (m, s); the final C values
 * are converted to yr⁻¹ once at module initialisation.
 *
 * Returned rates are in yr⁻¹.  Callers multiply by the current time-step
 * dt [yr] to obtain the Poisson parameter λΔt before sampling collision counts.
 *
 * Population categories
 * ─────────────────────
 *   S_a  Active satellites          (maneuverable)
 *   S_d  Defunct objects            (non-maneuverable; satellites + rocket bodies)
 *   D    Trackable debris ≥ D_min   (D_min = 10 cm; non-maneuverable)
 */

// ─── Shared interfaces ────────────────────────────────────────────────────────
//
// In a full project these would be imported from ../../types/index.ts.
// They are defined here so CollisionEngine.ts compiles as a self-contained unit.

/** Non-negative integer population count for a single object category
 *  within one altitude shell. */
import type {
  ShellPopulation,
  PopulationState,
  PhysicsParameters,
  SimulationState,
} from "../core/Types.js";

// ─── Collision rate output ─────────────────────────────────────────────────────

/**
 * All twelve per-pair collision rates for both altitude shells, in yr⁻¹.
 *
 * Naming convention:  lambda<PAIR>_<SHELL>
 *
 *   Pairs:
 *     AA  =  (S_a, S_a)      active  × active
 *     AD  =  (S_a, S_d)      active  × defunct
 *     AF  =  (S_a, D)        active  × debris
 *     DD  =  (S_d, S_d)      defunct × defunct
 *     DF  =  (S_d, D)        defunct × debris
 *     FF  =  (D,   D)        debris  × debris
 *
 *   Shells:
 *     _A  =  600 km centroid
 *     _B  =  850 km centroid
 */
export interface CollisionRates {
  // ── Shell A (600 km) ────────────────────────────────────────────────────
  readonly lambdaAA_A: number;
  readonly lambdaAD_A: number;
  readonly lambdaAF_A: number;
  readonly lambdaDD_A: number;
  readonly lambdaDF_A: number;
  readonly lambdaFF_A: number;
  // ── Shell B (850 km) ────────────────────────────────────────────────────
  readonly lambdaAA_B: number;
  readonly lambdaAD_B: number;
  readonly lambdaAF_B: number;
  readonly lambdaDD_B: number;
  readonly lambdaDF_B: number;
  readonly lambdaFF_B: number;
}

// ─── Per-pair quantity interface ──────────────────────────────────────────────

/**
 * One scalar value per collision pair.
 *
 * Used for both the fixed geometric cross-sections (m²) and the
 * derived per-pair rate coefficients (yr⁻¹), which share the same
 * six-element structure.
 */
export interface PairCoefficients {
  readonly aa: number;  // (S_a, S_a)
  readonly ad: number;  // (S_a, S_d)
  readonly af: number;  // (S_a, D)
  readonly dd: number;  // (S_d, S_d)
  readonly df: number;  // (S_d, D)
  readonly ff: number;  // (D,   D)
}

// ─── Physical constants ────────────────────────────────────────────────────────

/**
 * Julian year in seconds: 365.25 d × 86 400 s d⁻¹.
 * Exported for use by other physics sub-modules.
 */
export const SECONDS_PER_YEAR: number = 365.25 * 86_400;  // 31 557 600 s yr⁻¹

/** Earth's standard gravitational parameter  μ = GM  [m³ s⁻²]. */
const MU = 3.986e14;

/** Earth's mean radius  R_E  [m]. */
const R_E = 6.371e6;

/** Uniform shell thickness  Δh  [m]  (100 km for both shells). */
const DELTA_H = 1.0e5;

// ─── Shell kinematics ─────────────────────────────────────────────────────────

/** Centroid altitude, Shell A [m]  (600 km). */
const H_A = 6.0e5;

/** Centroid altitude, Shell B [m]  (850 km). */
const H_B = 8.5e5;

/** Orbital radius, Shell A  r_A = R_E + H_A  [m]. */
const R_A = R_E + H_A;   // 6.971 × 10⁶ m

/** Orbital radius, Shell B  r_B = R_E + H_B  [m]. */
const R_B = R_E + H_B;   // 7.221 × 10⁶ m

/** Shell volume  V_k = 4π r_k² Δh  [m³]. */
const V_A = 4.0 * Math.PI * R_A * R_A * DELTA_H;   // ≈ 6.107 × 10¹⁹ m³
const V_B = 4.0 * Math.PI * R_B * R_B * DELTA_H;   // ≈ 6.552 × 10¹⁹ m³

/**
 * Circular orbital speed  v_c = √(μ/r)  [m s⁻¹].
 *
 *   v_c^A ≈ 7 562 m s⁻¹
 *   v_c^B ≈ 7 430 m s⁻¹
 */
const V_C_A = Math.sqrt(MU / R_A);
const V_C_B = Math.sqrt(MU / R_B);

/**
 * Mean relative velocity under the isotropic inclination approximation:
 *   v̄_rel = √2 · v_c   [m s⁻¹].
 *
 * Assumption: orbital inclinations are uniformly distributed within the shell.
 * This approximation is acknowledged in the limitations section and produces
 * a conservative (slightly elevated) threshold estimate.
 *
 *   v̄_rel^A ≈ 10 692 m s⁻¹
 *   v̄_rel^B ≈ 10 505 m s⁻¹
 */
const V_REL_A = Math.SQRT2 * V_C_A;
const V_REL_B = Math.SQRT2 * V_C_B;

// ─── Shell geometry export ────────────────────────────────────────────────────

/** Physical geometry for a single altitude shell. */
export interface ShellGeometry {
  readonly centroidAltitudeM:   number;   // h_k    [m]
  readonly orbitalRadiusM:      number;   // r_k    [m]
  readonly volumeM3:            number;   // V_k    [m³]
  readonly circularSpeedMs:     number;   // v_c^k  [m s⁻¹]
  readonly meanRelSpeedMs:      number;   // v̄_rel^k [m s⁻¹]
}

/** Physical geometry for both altitude shells.
 *  Exported for use by other physics sub-modules (decay, R computation). */
export interface ShellGeometries {
  readonly A: ShellGeometry;
  readonly B: ShellGeometry;
}

/** Precomputed shell geometry constants. */
export const SHELL_GEOMETRY: ShellGeometries = {
  A: {
    centroidAltitudeM:  H_A,
    orbitalRadiusM:     R_A,
    volumeM3:           V_A,
    circularSpeedMs:    V_C_A,
    meanRelSpeedMs:     V_REL_A,
  },
  B: {
    centroidAltitudeM:  H_B,
    orbitalRadiusM:     R_B,
    volumeM3:           V_B,
    circularSpeedMs:    V_C_B,
    meanRelSpeedMs:     V_REL_B,
  },
};

// ─── Geometric cross-sections ─────────────────────────────────────────────────

/**
 * Geometric collision cross-sections  σ^(c1,c2) = π(r_c1 + r_c2)²  [m²].
 *
 * Effective radii, derived from mean cross-sectional area per category:
 *
 *   r_a = 1.38 m  (active satellite,  A_eff ≈ 6 m²    — Starlink-class)
 *   r_d = 1.78 m  (defunct object,    A_eff ≈ 10 m²   — mixed sat + rocket body)
 *   r_f = 0.05 m  (10 cm debris,      A_eff ≈ 7.85 × 10⁻³ m²)
 *
 * Cross-sections:
 *   σ^aa = π(1.38 + 1.38)² ≈ 23.9 m²
 *   σ^ad = π(1.38 + 1.78)² ≈ 31.4 m²
 *   σ^af = π(1.38 + 0.05)² ≈  6.42 m²
 *   σ^dd = π(1.78 + 1.78)² ≈ 39.8 m²
 *   σ^df = π(1.78 + 0.05)² ≈ 10.5 m²
 *   σ^ff = π(0.05 + 0.05)² ≈  0.031 m²
 */
export const CROSS_SECTIONS_M2: PairCoefficients = {
  aa:  23.9,
  ad:  31.4,
  af:   6.42,
  dd:  39.8,
  df:  10.5,
  ff:   0.031,
};

// ─── Rate-coefficient builder ─────────────────────────────────────────────────

/**
 * Computes  C_k^(c1,c2) = σ^(c1,c2) · v̄_rel^k / V_k · SECONDS_PER_YEAR
 * for every pair in one shell, returning coefficients in yr⁻¹.
 *
 * @param vRelMs   - Mean relative velocity for the shell  [m s⁻¹].
 * @param volumeM3 - Shell volume  V_k  [m³].
 * @returns          Per-pair rate coefficients  [yr⁻¹].
 */
function buildPairCoefficients(
  vRelMs:   number,
  volumeM3: number,
): PairCoefficients {
  // factor = (v̄_rel / V_k) · s_per_yr   [yr⁻¹ m⁻²]
  const factor = (vRelMs / volumeM3) * SECONDS_PER_YEAR;

  return {
    aa: CROSS_SECTIONS_M2.aa * factor,
    ad: CROSS_SECTIONS_M2.ad * factor,
    af: CROSS_SECTIONS_M2.af * factor,
    dd: CROSS_SECTIONS_M2.dd * factor,
    df: CROSS_SECTIONS_M2.df * factor,
    ff: CROSS_SECTIONS_M2.ff * factor,
  };
}

// ─── Shell-level rate coefficients ───────────────────────────────────────────

/** Per-pair rate coefficients for both altitude shells. */
export interface ShellRateCoefficients {
  readonly A: PairCoefficients;
  readonly B: PairCoefficients;
}

/**
 * Module-level precomputed rate coefficients  C_k^(c1,c2)  [yr⁻¹].
 *
 * Computed once at module load from the fixed shell geometry and
 * cross-section constants; they never change during a simulation run.
 *
 * Shell A  (pre-factor ≈ 5.524 × 10⁻⁹ yr⁻¹ m⁻²):
 *   C_A^aa ≈ 1.320 × 10⁻⁷ yr⁻¹
 *   C_A^ad ≈ 1.735 × 10⁻⁷ yr⁻¹
 *   C_A^af ≈ 3.546 × 10⁻⁸ yr⁻¹
 *   C_A^dd ≈ 2.198 × 10⁻⁷ yr⁻¹
 *   C_A^df ≈ 5.800 × 10⁻⁸ yr⁻¹
 *   C_A^ff ≈ 1.712 × 10⁻¹⁰ yr⁻¹
 *
 * Shell B  (pre-factor ≈ 5.058 × 10⁻⁹ yr⁻¹ m⁻²):
 *   C_B^aa ≈ 1.209 × 10⁻⁷ yr⁻¹
 *   C_B^ad ≈ 1.588 × 10⁻⁷ yr⁻¹
 *   C_B^af ≈ 3.247 × 10⁻⁸ yr⁻¹
 *   C_B^dd ≈ 2.013 × 10⁻⁷ yr⁻¹
 *   C_B^df ≈ 5.311 × 10⁻⁸ yr⁻¹
 *   C_B^ff ≈ 1.568 × 10⁻¹⁰ yr⁻¹
 */
export const SHELL_COEFFICIENTS: ShellRateCoefficients = {
  A: buildPairCoefficients(V_REL_A, V_A),
  B: buildPairCoefficients(V_REL_B, V_B),
};

// ─── Input validation ─────────────────────────────────────────────────────────

/**
 * Validates the fields of a SimulationState that CollisionEngine consumes.
 *
 * Throws a RangeError on the first violated constraint.  This is an eager
 * check — it is cheaper to throw once at the top of computeCollisionRates
 * than to propagate NaN or negative rates into the Monte Carlo sampler.
 */
function validateState(state: SimulationState): void {
  const { pAvoid } = state.params;

  if (!isFinite(pAvoid) || pAvoid < 0 || pAvoid > 1) {
    throw new RangeError(
      `params.pAvoid must be a finite value in [0, 1]; received ${pAvoid}`,
    );
  }

  // Validate each shell's population counts as non-negative integers.
  validateShellPopulation('A', state.populations.A);
  validateShellPopulation('B', state.populations.B);
}

/** Validates a single shell's population triple. */
function validateShellPopulation(
  shell: string,
  pop:   ShellPopulation,
): void {
  assertNonNegativeInteger(`Shell ${shell}.sa`, pop.sa);
  assertNonNegativeInteger(`Shell ${shell}.sd`, pop.sd);
  assertNonNegativeInteger(`Shell ${shell}.d`,  pop.d);
}

/** Throws a RangeError if `value` is not a non-negative integer. */
function assertNonNegativeInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(
      `${name} must be a non-negative integer; received ${value}`,
    );
  }
}

// ─── Core collision-rate engine ───────────────────────────────────────────────

/**
 * Computes all twelve per-pair orbital collision rates for both shells.
 *
 * Each rate is in yr⁻¹ (expected collision events per year for that pair
 * and shell). Multiply by the current time-step `state.dt` to obtain the
 * Poisson parameter λΔt before sampling collision counts.
 *
 * Formula applied per shell k and pair (c1, c2):
 *
 *   ω^(c1,c2,k) = f_sym · ε^(c1,c2) · C_k^(c1,c2) · N^(k,c1) · N^(k,c2)
 *
 * @param state - Full simulation state at time step i.
 * @returns       Twelve named collision rates [yr⁻¹].
 *
 * @throws {RangeError} if pAvoid ∉ [0, 1] or any population count is
 *                      negative or non-integer.
 */
export function computeCollisionRates(state: SimulationState): CollisionRates {
  validateState(state);

  const { A, B }   = state.populations;
  const { pAvoid } = state.params;
  const C          = SHELL_COEFFICIENTS;

  // ── Avoidance scaling factors ─────────────────────────────────────────────
  //
  //   p1 = (1 − P_avoid)     applied when exactly one party is active
  //   p2 = (1 − P_avoid)²    applied when both parties are active
  //
  // These are computed once and reused across all same-type pairs.

  const p1 = 1.0 - pAvoid;    // (1 − P_avoid)
  const p2 = p1 * p1;         // (1 − P_avoid)²

  // ── Shell A rates ─────────────────────────────────────────────────────────
  //
  //   Same-species pairs carry f_sym = 0.5 (aa, dd, ff).
  //   Cross-species pairs carry f_sym = 1.0 (ad, af, df).
  //
  //   Avoidance factor ε is folded into the formula directly; the
  //   C coefficient and population product are always non-negative,
  //   so all returned rates are guaranteed ≥ 0.

  const lambdaAA_A = 0.5 * p2 * C.A.aa * A.sa * A.sa;   // f=0.5, ε=(1-p)²
  const lambdaAD_A =       p1 * C.A.ad * A.sa * A.sd;   // f=1.0, ε=(1-p)
  const lambdaAF_A =       p1 * C.A.af * A.sa * A.d;    // f=1.0, ε=(1-p)
  const lambdaDD_A = 0.5 *      C.A.dd * A.sd * A.sd;   // f=0.5, ε=1
  const lambdaDF_A =             C.A.df * A.sd * A.d;   // f=1.0, ε=1
  const lambdaFF_A = 0.5 *      C.A.ff * A.d  * A.d;   // f=0.5, ε=1

  // ── Shell B rates ─────────────────────────────────────────────────────────

  const lambdaAA_B = 0.5 * p2 * C.B.aa * B.sa * B.sa;
  const lambdaAD_B =       p1 * C.B.ad * B.sa * B.sd;
  const lambdaAF_B =       p1 * C.B.af * B.sa * B.d;
  const lambdaDD_B = 0.5 *      C.B.dd * B.sd * B.sd;
  const lambdaDF_B =             C.B.df * B.sd * B.d;
  const lambdaFF_B = 0.5 *      C.B.ff * B.d  * B.d;

  return {
    lambdaAA_A,
    lambdaAD_A,
    lambdaAF_A,
    lambdaDD_A,
    lambdaDF_A,
    lambdaFF_A,
    lambdaAA_B,
    lambdaAD_B,
    lambdaAF_B,
    lambdaDD_B,
    lambdaDF_B,
    lambdaFF_B,
  };
}

// ─── Total collision rate helpers ─────────────────────────────────────────────

/**
 * Returns the total collision rate for Shell A by summing all six pair rates.
 *
 *   Λ^A = ω^AA_A + ω^AD_A + ω^AF_A + ω^DD_A + ω^DF_A + ω^FF_A   [yr⁻¹]
 *
 * Primary use: the adaptive time-step controller checks
 *
 *   computeTotalCollisionRateA(rates) × state.dt < 0.1
 *
 * before accepting the current Δt; if the condition fails the step is halved.
 *
 * @param rates - Output of computeCollisionRates.
 * @returns       Total collision rate for Shell A [yr⁻¹].
 */
export function computeTotalCollisionRateA(rates: CollisionRates): number {
  return (
    rates.lambdaAA_A +
    rates.lambdaAD_A +
    rates.lambdaAF_A +
    rates.lambdaDD_A +
    rates.lambdaDF_A +
    rates.lambdaFF_A
  );
}

/**
 * Returns the total collision rate for Shell B by summing all six pair rates.
 *
 *   Λ^B = ω^AA_B + ω^AD_B + ω^AF_B + ω^DD_B + ω^DF_B + ω^FF_B   [yr⁻¹]
 *
 * @param rates - Output of computeCollisionRates.
 * @returns       Total collision rate for Shell B [yr⁻¹].
 */
export function computeTotalCollisionRateB(rates: CollisionRates): number {
  return (
    rates.lambdaAA_B +
    rates.lambdaAD_B +
    rates.lambdaAF_B +
    rates.lambdaDD_B +
    rates.lambdaDF_B +
    rates.lambdaFF_B
  );
}