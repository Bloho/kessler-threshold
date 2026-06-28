# Kessler Threshold

A stochastic Monte Carlo simulation framework for investigating the emergence of self-sustaining orbital debris cascades (Kessler Syndrome) in Low Earth Orbit (LEO).

This project accompanies the research paper:

> **Probabilistic Estimation of the Critical Density Threshold for Kessler Syndrome in Low Earth Orbit Using a Two-Shell Monte Carlo Model**

The simulator models orbital debris evolution using a simplified two-shell representation of LEO and estimates the probability of debris cascade formation across varying orbital population densities.

---

## Features

- Two-shell Low Earth Orbit model
- Stochastic collision generation using Poisson processes
- Debris fragmentation model
- Atmospheric decay
- Active satellite failure
- Collision avoidance modeling
- Monte Carlo simulation framework
- Density sweep experiments
- CSV result generation
- Publication-quality figure generation

---

## Repository Structure

```text
.
├── src/
│   ├── physics/
│   ├── simulation/
│   ├── models/
│   ├── utils/
│   └── index.ts
│
├── scripts/
│   ├── densitySweep.ts
│   └── ...
│
├── results/
│
├── paper/
│
├── figures/
│
├── package.json
└── README.md
```

---

## Requirements

- Node.js 20+
- npm

Verify your installation:

```bash
node -v
npm -v
```

---

## Installation

Clone the repository

```bash
git clone https://github.com/Bloho/kessler-threshold.git
```

Enter the project directory

```bash
cd kessler-threshold
```

Install dependencies

```bash
npm install
```

---

## Running the Simulation

Execute the Monte Carlo density sweep:

```bash
npm start
```

or

```bash
npx tsx src/index.ts
```

Depending on your project structure.

The simulator will perform the configured density sweep and print output similar to:

```text
Density 0.0850 | 5/200 cascades | P=0.025
Density 0.0875 | 29/200 cascades | P=0.145
Density 0.0900 | 70/200 cascades | P=0.350
...
Density 0.1075 | 200/200 cascades | P=1.000
```

Simulation results are saved inside the `results/` directory.

---

## Configuration

Simulation parameters can be modified inside the configuration file.

Examples include:

- orbital shell altitudes
- collision coefficients
- atmospheric lifetimes
- collision avoidance probability
- failure rate
- timestep
- number of Monte Carlo realizations
- density multiplier range

Changing these values allows different orbital environments to be investigated.

---

## Reproducing the Paper

The published figures can be reproduced using the simulation outputs.

1. Run the density sweep

```bash
npm start
```

2. Generate the figures

```bash
python plot_results.py
```

(or whichever plotting script is included.)

This produces the probability curve used in the accompanying paper.

---

## Simulation Overview

Each simulation timestep performs the following sequence:

1. Compute collision rates
2. Sample collisions using Poisson statistics
3. Generate debris fragments
4. Apply atmospheric decay
5. Apply satellite failures
6. Update populations
7. Check cascade criterion
8. Continue until termination

The experiment is repeated hundreds of times for each orbital density in order to estimate the empirical cascade probability.

---

## Model Limitations

This simulator is intentionally simplified for computational efficiency.

Current assumptions include:

- Two discrete orbital shells
- Uniformly mixed orbital populations
- Simplified fragmentation model
- No orbital inclination or eccentricity propagation
- No launch traffic
- No active debris removal
- No detailed conjunction analysis

The simulator is therefore intended for investigating probabilistic threshold behaviour rather than reproducing the contemporary orbital debris environment.

---

## Citation

If you use this repository in academic work, please cite:

```bibtex
@misc{samanta2026,
  author = {Ayush Samanta},
  title = {Probabilistic Estimation of the Critical Density Threshold for Kessler Syndrome in Low Earth Orbit Using a Two-Shell Monte Carlo Model},
  year = {2026},
  note = {Open-source Monte Carlo simulation framework}
}
```

---

## License

This project is released under the MIT License.

---

## Acknowledgements

This work builds upon foundational research in orbital debris dynamics by:

- Donald J. Kessler
- Burton G. Cour-Palais
- NASA Orbital Debris Program Office
- European Space Agency (ESA)

---

## Author

**Ayush Samanta**

Independent Research

GitHub: https://github.com/Bloho
