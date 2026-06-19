import { runMonteCarlo } from "./simulation/MonteCarloRunner.js";

const initialState = {
  populations: {
    A: {
      sa: 5000,
      sd: 5000,
      d: 50000,
    },
    B: {
      sa: 5000,
      sd: 5000,
      d: 50000,
    },
  },

  params: {
    pAvoid: 0.9,
  },

  stepIndex: 0,
  dt: 1 / 12,
  refinementDepth: 0,
};

const result = runMonteCarlo(initialState);

console.log(
  JSON.stringify(result, null, 2)
);