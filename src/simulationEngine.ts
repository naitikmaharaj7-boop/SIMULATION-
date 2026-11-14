import { DaySimulation, PlantState, Tuber, BasalIntegrity, PlantStatus, GrowthStage } from './types';

// Helper to generate deterministic-looking pseudorandom variance for individual plants
function getPlantVariance(plantIndex: number, prime: number): number {
  const seed = (plantIndex * prime) % 100;
  return seed / 100; // Value between 0.0 and 0.99
}

export function generateSimulationRun(
  growthStage: GrowthStage,
  foliarDosage: number,
  foliarDecayPercent: number,
  sshiDosage: number,
  sshiPressure: number,
  phloemVelocity: number
): DaySimulation[] {
  const simulations: DaySimulation[] = [];
  const uvDecayFactor = foliarDecayPercent / 100;

  // Build the state day by day from Day 0 to Day 30
  for (let day = 0; day <= 30; day++) {
    const fieldA: PlantState[] = [];
    const fieldB: PlantState[] = [];

    for (let i = 0; i < 100; i++) {
      // --- FIELD A: FOLIAR ---
      // Micro-environmental spray coverage variation (e.g. 85% to 115% of calibrated dosage)
      const foliarVar = 0.85 + 0.30 * getPlantVariance(i, 17);
      const initialDoseA = foliarDosage * foliarVar;
      
      // Equation 1: Foliar Dilution & Decay
      const activeDoseA = initialDoseA * (1 - uvDecayFactor);

      // Translocation depth based on phloem velocity and time
      // Let's assume a standard rate where at 1x velocity it translocates ~0.25 tubers per day
      const transRateA = 0.22 * phloemVelocity * (0.8 + 0.4 * getPlantVariance(i, 31));
      const transDepthA = day * transRateA;

      const tubersA: Tuber[] = [];
      let deadCountA = 0;
      for (let n = 1; n <= 8; n++) {
        const depthCm = n * 4.0; // 4cm spacing down the rhizome chain
        const reached = n <= transDepthA;
        
        // Exponential decay of concentration along the rhizome chain:
        // Conc(n) = Active Dose * e^(-0.4 * n)
        const concentration = activeDoseA * Math.exp(-0.4 * n);
        
        // Critical threshold check: remains viable if concentration is below 0.15 mg
        const alive = day === 0 ? true : !(reached && concentration >= 0.15);
        if (!alive) deadCountA++;

        tubersA.push({
          number: n,
          depthCm,
          reached,
          concentration: reached ? parseFloat(concentration.toFixed(3)) : 0,
          alive
        });
      }

      // Shoot Necrosis increases progressively over days based on active dose
      // At day 0, it's 0.
      let shootNecrosisA = 0;
      if (day > 0) {
        shootNecrosisA = Math.min(
          100,
          Math.round(100 * (1 - Math.exp(-0.15 * activeDoseA * day)))
        );
      }

      // Basal Junction Integrity:
      // Becomes necrotic if shoot necrosis is very high (decaying tissue)
      const basalIntegrityA: BasalIntegrity = shootNecrosisA > 80 ? 'Necrotic' : 'Intact';

      // Status determination
      let statusA: PlantStatus = 'Healthy';
      if (day > 0) {
        if (shootNecrosisA > 85 && deadCountA === 8) {
          statusA = 'Dead';
        } else if (shootNecrosisA > 30) {
          statusA = 'Necrosis';
        } else if (shootNecrosisA > 0) {
          statusA = 'Stunted';
        }
      }

      fieldA.push({
        id: `A-${i + 1}`,
        index: i,
        shootNecrosis: shootNecrosisA,
        basalIntegrity: basalIntegrityA,
        tubers: tubersA,
        isRuptured: false,
        status: statusA,
        activeDose: parseFloat(activeDoseA.toFixed(3)),
        efficacy: 100,
        translocationDepth: Math.min(8, parseFloat(transDepthA.toFixed(2)))
      });


      // --- FIELD B: SUB-SURFACE BASAL INJECTION (SSHI) ---
      // Minor plant-to-plant mechanical strain resistance variation
      const ruptureVar = 0.92 + 0.16 * getPlantVariance(i, 43);
      const baseRuptureLimit = growthStage === 'young' ? 65 : 85;
      const individualRuptureLimit = baseRuptureLimit * ruptureVar;

      // Equation 2: SSHI Hydraulic Strain and blow-out trigger
      const isRupturedB = sshiPressure > individualRuptureLimit;

      // Efficacy model based on delivery pressure bounds
      let efficacyB = 1.0;
      if (isRupturedB) {
        efficacyB = 0.15; // Drops to 15% efficacy as chemical vents
      } else {
        if (sshiPressure < 35) {
          // Low pressure delivery penalty
          efficacyB = sshiPressure / 35;
        } else if (sshiPressure <= 60) {
          // Optimal direct injection bounds (Equation 3)
          efficacyB = 1.0;
        } else {
          // Progressive high pressure bypass/leakage prior to structural failure
          const ratio = (sshiPressure - 60) / (individualRuptureLimit - 60);
          efficacyB = 1.0 - 0.5 * ratio;
        }
      }

      // Active dose delivered directly into the basal stem bulb with zero UV decay
      const initialDoseB = sshiDosage * (0.9 + 0.2 * getPlantVariance(i, 53));
      const activeDoseB = initialDoseB * efficacyB;

      // Fluid travels much faster laterally and vertically because of pressure-assisted direct tissue injection
      // Velocity factor scales progress
      const transRateB = 0.42 * phloemVelocity * (0.85 + 0.3 * getPlantVariance(i, 71));
      const transDepthB = day * transRateB;

      const tubersB: Tuber[] = [];
      let deadCountB = 0;

      for (let n = 1; n <= 8; n++) {
        const depthCm = n * 4.0;
        const reached = n <= transDepthB;

        // Equation 3 / Systemic delivery:
        // Concentration along rhizome has much slower decay due to direct deep vascular push!
        // Conc(n) = Active Dose * e^(-0.15 * n)
        const concentration = activeDoseB * Math.exp(-0.15 * n);

        const alive = day === 0 ? true : !(reached && concentration >= 0.15);
        if (!alive) deadCountB++;

        tubersB.push({
          number: n,
          depthCm,
          reached,
          concentration: reached ? parseFloat(concentration.toFixed(3)) : 0,
          alive
        });
      }

      // Shoot Necrosis
      let shootNecrosisB = 0;
      if (day > 0) {
        if (isRupturedB) {
          // If ruptured, very low chemical remains inside plant vascular tissues. It mostly leaks out, causing minor stunting.
          shootNecrosisB = Math.min(
            25,
            Math.round(25 * (1 - Math.exp(-0.08 * activeDoseB * day)))
          );
        } else {
          // Direct vascular injection kills leaves aggressively from inside out
          shootNecrosisB = Math.min(
            100,
            Math.round(100 * (1 - Math.exp(-0.28 * activeDoseB * day)))
          );
        }
      }

      // Basal Junction Integrity Status
      let basalIntegrityB: BasalIntegrity = 'Intact';
      if (isRupturedB) {
        basalIntegrityB = 'Blown out/Leaked';
      } else if (shootNecrosisB > 80) {
        basalIntegrityB = 'Necrotic';
      }

      // Color-coding and status determination
      let statusB: PlantStatus = 'Healthy';
      if (day > 0) {
        if (isRupturedB) {
          statusB = 'Ruptured';
        } else if (shootNecrosisB > 85 && deadCountB === 8) {
          statusB = 'Dead';
        } else if (shootNecrosisB > 30) {
          statusB = 'Necrosis';
        } else if (shootNecrosisB > 0) {
          statusB = 'Stunted';
        }
      }

      fieldB.push({
        id: `B-${i + 1}`,
        index: i,
        shootNecrosis: shootNecrosisB,
        basalIntegrity: basalIntegrityB,
        tubers: tubersB,
        isRuptured: isRupturedB,
        status: statusB,
        activeDose: parseFloat(activeDoseB.toFixed(3)),
        efficacy: Math.round(efficacyB * 100),
        translocationDepth: Math.min(8, parseFloat(transDepthB.toFixed(2)))
      });
    }

    simulations.push({
      day,
      fieldA,
      fieldB
    });
  }

  return simulations;
}
