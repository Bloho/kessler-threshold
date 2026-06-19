import { runDensitySweep }
from "./simulation/DensitySweep.js";

const results = runDensitySweep();

console.log("\nFINAL RESULTS\n");

console.table(results);