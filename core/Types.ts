// core/Types.ts

/**
 * Population counts within a single altitude shell.
 */
export interface ShellPopulation {
  sa: number; // Active satellites
  sd: number; // Defunct objects
  d: number;  // Trackable debris
}

/**
 * Population state for both shells.
 */
export interface PopulationState {
  A: ShellPopulation;
  B: ShellPopulation;
}

/**
 * Global physics parameters for a simulation run.
 */
export interface PhysicsParameters {
  /**
   * Collision avoidance success probability.
   * Range: [0,1]
   * Typical value: 0.90
   */
  pAvoid: number;
}

/**
 * Complete simulation state at one timestep.
 */
export interface SimulationState {
  populations: PopulationState;

  params: PhysicsParameters;

  /**
   * Current timestep index.
   */
  stepIndex: number;

  /**
   * Current timestep duration in years.
   * Nominal value = 1/12 yr.
   */
  dt: number;

  /**
   * Adaptive timestep refinement depth.
   * Maximum = 10.
   */
  refinementDepth: number;
}

/**
 * Metadata describing one Monte Carlo run.
 */
export interface RunMetadata {
  runId: number;
  scenarioId: string;

  densityMultiplier: number;

  seed: number;
}

/**
 * Result returned from a completed Monte Carlo run.
 */
export interface RunResult {
  cascade: boolean;

  terminated: boolean;

  terminationReason?: string;

  finalState: SimulationState;
}

/**
 * Scenario configuration.
 * Phase 7 will populate these values from
 * the experimental design matrix.
 */
export interface ScenarioDefinition {
  id: string;
  name: string;

  avoidanceProbability: number;

  launchRateA: number;
  launchRateB: number;

  pmdCompliance: number;

  initialFractionsA: {
    active: number;
    defunct: number;
    debris: number;
  };

  initialFractionsB: {
    active: number;
    defunct: number;
    debris: number;
  };
}