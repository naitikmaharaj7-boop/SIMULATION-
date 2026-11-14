export type GrowthStage = 'young' | 'mature';

export interface Tuber {
  number: number; // 1 to 8
  depthCm: number;
  reached: boolean;
  concentration: number;
  alive: boolean;
}

export type BasalIntegrity = 'Intact' | 'Necrotic' | 'Blown out/Leaked';

export type PlantStatus = 'Healthy' | 'Stunted' | 'Necrosis' | 'Dead' | 'Ruptured';

export interface PlantState {
  id: string;
  index: number;
  shootNecrosis: number; // 0 to 100
  basalIntegrity: BasalIntegrity;
  tubers: Tuber[];
  isRuptured: boolean;
  status: PlantStatus;
  activeDose: number;
  efficacy: number;
  translocationDepth: number;
}

export interface DaySimulation {
  day: number;
  fieldA: PlantState[]; // Foliar Broadcast Spraying
  fieldB: PlantState[]; // Sub-Surface Basal Injection (SSHI)
}
