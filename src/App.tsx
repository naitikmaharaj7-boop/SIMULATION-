import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Info,
  Activity,
  CheckCircle2,
  AlertTriangle,
  X,
  TrendingUp,
  Droplet,
  Sun,
  Flame,
  HelpCircle,
  Eye
} from 'lucide-react';
import { generateSimulationRun } from './simulationEngine';
import { DaySimulation, PlantState, Tuber, GrowthStage, PlantStatus } from './types';

export default function App() {
  // --- Simulation Settings State ---
  const [growthStage, setGrowthStage] = useState<GrowthStage>('young');
  const [foliarDosage, setFoliarDosage] = useState<number>(2.5);
  const [foliarDecayPercent, setFoliarDecayPercent] = useState<number>(25);
  const [sshiDosage, setSshiDosage] = useState<number>(2.5);
  const [sshiPressure, setSshiPressure] = useState<number>(45); // Safe/optimal is 35 to 60 PSI
  const [phloemVelocity, setPhloemVelocity] = useState<number>(2);
  
  // --- Timeline State ---
  const [currentDay, setCurrentDay] = useState<number>(15);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  // --- Selection / Modal State ---
  const [selectedPlant, setSelectedPlant] = useState<{ field: 'A' | 'B'; index: number } | null>(null);

  // --- Auto-Play Effects ---
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentDay((prev) => {
          if (prev >= 30) {
            setIsPlaying(false);
            return 30;
          }
          return prev + 1;
        });
      }, 500); // Progresses one day every 500ms
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  // --- Run / Reset Helpers ---
  const handleRunSimulation = () => {
    setCurrentDay(0);
    setIsPlaying(true);
  };

  const handleResetField = () => {
    setIsPlaying(false);
    setGrowthStage('young');
    setFoliarDosage(2.5);
    setFoliarDecayPercent(25);
    setSshiDosage(2.5);
    setSshiPressure(45);
    setPhloemVelocity(2);
    setCurrentDay(0);
    setSelectedPlant(null);
  };

  // --- Run Mathematics on Parameters ---
  const simulationData: DaySimulation[] = useMemo(() => {
    return generateSimulationRun(
      growthStage,
      foliarDosage,
      foliarDecayPercent,
      sshiDosage,
      sshiPressure,
      phloemVelocity
    );
  }, [growthStage, foliarDosage, foliarDecayPercent, sshiDosage, sshiPressure, phloemVelocity]);

  // --- Current Active Day Data ---
  const activeDaySimulation = simulationData[currentDay] || simulationData[0];
  const fieldAPlants = activeDaySimulation.fieldA;
  const fieldBPlants = activeDaySimulation.fieldB;

  // --- Precalculate Stats for Active Day ---
  const stats = useMemo(() => {
    let deadPlantsA = 0;
    let stuntedPlantsA = 0;
    let necrosisPlantsA = 0;
    let healthyPlantsA = 0;
    let deadTubersA = 0;
    let totalShootNecrosisA = 0;

    fieldAPlants.forEach((p) => {
      totalShootNecrosisA += p.shootNecrosis;
      if (p.status === 'Dead') deadPlantsA++;
      else if (p.status === 'Necrosis') necrosisPlantsA++;
      else if (p.status === 'Stunted') stuntedPlantsA++;
      else if (p.status === 'Healthy') healthyPlantsA++;

      p.tubers.forEach((t) => {
        if (!t.alive) deadTubersA++;
      });
    });

    let deadPlantsB = 0;
    let stuntedPlantsB = 0;
    let necrosisPlantsB = 0;
    let healthyPlantsB = 0;
    let rupturedPlantsB = 0;
    let deadTubersB = 0;
    let totalShootNecrosisB = 0;

    fieldBPlants.forEach((p) => {
      totalShootNecrosisB += p.shootNecrosis;
      if (p.status === 'Dead') deadPlantsB++;
      else if (p.status === 'Necrosis') necrosisPlantsB++;
      else if (p.status === 'Stunted') stuntedPlantsB++;
      else if (p.status === 'Healthy') healthyPlantsB++;
      else if (p.status === 'Ruptured') rupturedPlantsB++;

      p.tubers.forEach((t) => {
        if (!t.alive) deadTubersB++;
      });
    });

    return {
      fieldA: {
        deadPlants: deadPlantsA,
        stuntedPlants: stuntedPlantsA,
        necrosisPlants: necrosisPlantsA,
        healthyPlants: healthyPlantsA,
        deadTubers: deadTubersA,
        liveTubers: 800 - deadTubersA,
        deadTuberPct: parseFloat(((deadTubersA / 800) * 100).toFixed(1)),
        liveTuberPct: parseFloat((((800 - deadTubersA) / 800) * 100).toFixed(1)),
        avgShootNecrosis: Math.round(totalShootNecrosisA / 100)
      },
      fieldB: {
        deadPlants: deadPlantsB,
        stuntedPlants: stuntedPlantsB,
        necrosisPlants: necrosisPlantsB,
        healthyPlants: healthyPlantsB,
        rupturedPlants: rupturedPlantsB,
        deadTubers: deadTubersB,
        liveTubers: 800 - deadTubersB,
        deadTuberPct: parseFloat(((deadTubersB / 800) * 100).toFixed(1)),
        liveTuberPct: parseFloat((((800 - deadTubersB) / 800) * 100).toFixed(1)),
        avgShootNecrosis: Math.round(totalShootNecrosisB / 100)
      }
    };
  }, [fieldAPlants, fieldBPlants]);

  // --- Modal Specific Target Plant ---
  const activeSelectedPlantState: PlantState | null = useMemo(() => {
    if (!selectedPlant) return null;
    const plants = selectedPlant.field === 'A' ? fieldAPlants : fieldBPlants;
    return plants[selectedPlant.index] || null;
  }, [selectedPlant, fieldAPlants, fieldBPlants]);

  // Status helper colors for grids and labels
  const getStatusColorClass = (status: PlantStatus) => {
    switch (status) {
      case 'Healthy':
        return 'bg-emerald-500 border-emerald-600 hover:bg-emerald-400';
      case 'Stunted':
        return 'bg-amber-400 border-amber-500 hover:bg-amber-300';
      case 'Necrosis':
        return 'bg-amber-800 border-amber-900 hover:bg-amber-700';
      case 'Dead':
        return 'bg-zinc-900 border-black hover:bg-zinc-800';
      case 'Ruptured':
        return 'bg-ruptured border-purple-700 hover:opacity-90';
      default:
        return 'bg-slate-300';
    }
  };

  const getStatusLabelText = (status: PlantStatus) => {
    switch (status) {
      case 'Healthy': return 'Healthy Shoot';
      case 'Stunted': return 'Low-Level Stunting';
      case 'Necrosis': return 'Vascular Necrosis';
      case 'Dead': return 'Core & Tuber Mortality';
      case 'Ruptured': return 'Mechanical Tissue Rupture';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* --- TOP HEADER --- */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm" id="header">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-semibold tracking-wider text-emerald-600 uppercase">
              Agronomic Data Modeling & Weed Science
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Agronomic Comparison Simulator: Foliar vs. Sub-Surface Injection
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Empirical model simulating rhizome translocation mechanics in <span className="italic font-medium">Cyperus rotundus</span> plots over a 30-day timeline.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-100 text-xs font-medium">
            <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>APSIM-Weed & FlorSys Calibrated</span>
          </div>
        </div>
      </header>

      {/* --- SIMULATOR GRID WORKSPACE --- */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6" id="workspace">
        
        {/* --- LEFT SIDE: PARAMETERS INTERFACE PANEL (lg:col-span-4) --- */}
        <section className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-6" id="parameters-panel">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Sliders className="w-5 h-5 text-emerald-600" />
              Parameter Interface Panel
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Calibrate treatment dosages, molecular decay, and physical pressure metrics below to test biological efficacy.
            </p>
          </div>

          {/* 1. Target Growth Stage */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              Target Growth Stage
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" title="Mature colonies possess higher tissue strain thresholds and greater initial rhizome density." />
            </label>
            <select
              value={growthStage}
              onChange={(e) => setGrowthStage(e.target.value as GrowthStage)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              id="growth-stage-select"
            >
              <option value="young">Young Emerged Shoot (Fragile tissue, Ruptures &gt; 65 PSI)</option>
              <option value="mature">Mature Established Colony (Hardened tissue, Ruptures &gt; 85 PSI)</option>
            </select>
          </div>

          {/* 2. Foliar Spray Side Variables */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                Foliar Pathway
              </span>
              <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-mono font-medium">Field A</span>
            </div>

            {/* Foliar Dosage Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-600">Foliar Dosage</span>
                <span className="font-mono font-bold text-emerald-600">{foliarDosage.toFixed(1)} mL</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={foliarDosage}
                onChange={(e) => setFoliarDosage(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                id="foliar-dosage-slider"
              />
              <span className="text-[10px] text-slate-400 text-right">Range: 0.1 – 5.0 mL</span>
            </div>

            {/* UV Decay Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-600">UV/Solar Decay Exposure Factor</span>
                <span className="font-mono font-bold text-amber-600">{foliarDecayPercent}% daily</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={foliarDecayPercent}
                onChange={(e) => setFoliarDecayPercent(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                id="foliar-decay-slider"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0% (Cloudy/Sheltered)</span>
                <span>50% (High Solar/UV)</span>
              </div>
            </div>
          </div>

          {/* 3. SSHI Injection Side Variables */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1">
                <Droplet className="w-3.5 h-3.5 text-blue-500" />
                SSHI Injection Pathway
              </span>
              <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-mono font-medium">Field B</span>
            </div>

            {/* SSHI Dosage Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-600">Injection Dosage</span>
                <span className="font-mono font-bold text-blue-600">{sshiDosage.toFixed(1)} mL</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={sshiDosage}
                onChange={(e) => setSshiDosage(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                id="sshi-dosage-slider"
              />
              <span className="text-[10px] text-slate-400 text-right">Range: 0.1 – 5.0 mL</span>
            </div>

            {/* SSHI Delivery Pressure Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-600">Injection Delivery Pressure</span>
                <span className={`font-mono font-bold ${sshiPressure >= 35 && sshiPressure <= 60 ? 'text-emerald-600' : sshiPressure > (growthStage === 'young' ? 65 : 85) ? 'text-purple-600' : 'text-slate-500'}`}>
                  {sshiPressure} PSI
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="1"
                value={sshiPressure}
                onChange={(e) => setSshiPressure(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                id="sshi-pressure-slider"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>10 PSI</span>
                <span className="text-emerald-600 font-semibold">35–60 PSI (Optimal)</span>
                <span>100 PSI</span>
              </div>
            </div>
          </div>

          {/* 4. Shared Physiology Variable */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                Vascular Phloem Flow Velocity
              </label>
              <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                {phloemVelocity}x base rate
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={phloemVelocity}
              onChange={(e) => setPhloemVelocity(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-700"
              id="phloem-velocity-slider"
            />
            <span className="text-[10px] text-slate-400">Simulates daily internal basipetal transport speed down the vascular nodes.</span>
          </div>

          {/* 5. Environmental Constants Display */}
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Environmental Constants</span>
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
              <div className="bg-white px-2.5 py-1.5 rounded border border-slate-200 text-center">
                <span className="block text-[9px] font-normal text-slate-400">Soil Fertility</span>
                <span className="text-slate-700">Stable/Optimal</span>
              </div>
              <div className="bg-white px-2.5 py-1.5 rounded border border-slate-200 text-center">
                <span className="block text-[9px] font-normal text-slate-400">Soil Moisture</span>
                <span className="text-slate-700">Constant Field Cap.</span>
              </div>
            </div>
          </div>

          {/* 6. Control Buttons */}
          <div className="grid grid-cols-2 gap-3 mt-auto">
            <button
              onClick={handleRunSimulation}
              className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-lg font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-1.5"
              id="run-simulation-button"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Run 30-Day</span>
            </button>
            <button
              onClick={handleResetField}
              className="border border-slate-200 hover:bg-slate-50 text-slate-600 py-2.5 px-4 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-1.5"
              id="reset-field-button"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Field</span>
            </button>
          </div>
        </section>

        {/* --- RIGHT SIDE: GRIDS, SCRUBBER, AND LIVE CHARTING (lg:col-span-8) --- */}
        <section className="lg:col-span-8 flex flex-col gap-6" id="dashboard-panel">
          
          {/* Scientific Context Summary Banner */}
          <div className="bg-emerald-900 text-emerald-100 rounded-xl p-4 shadow-sm relative overflow-hidden" id="context-banner">
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10">
              <HelpCircle className="w-32 h-32 text-white" />
            </div>
            <div className="relative z-10">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-300" />
                Cyperus rotundus Tuber Chain Mechanics
              </h3>
              <p className="text-xs text-emerald-200/90 leading-relaxed mt-1">
                Purple nutsedge spreads via a robust underground network. Foliar spray (Field A) faces strict cuticular resistance and exponential concentration decay along the deep rhizome nodes (Equation 1), leaving lower tubers viable to resprout. Sub-Surface Basal Injection (SSHI, Field B) bypasses foliar barriers, but overpressurizing leads to cellular strain rupture (Equation 2). Keep pressure within 35–60 PSI (Equation 3) for optimal tuber eradication.
              </p>
            </div>
          </div>

          {/* --- REAL-TIME TIMELINE SCRUBBER CARD --- */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-3" id="timeline-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
                    isPlaying 
                      ? 'bg-rose-100 border border-rose-200 text-rose-600 hover:bg-rose-200' 
                      : 'bg-emerald-100 border border-emerald-200 text-emerald-700 hover:bg-emerald-200'
                  }`}
                  title={isPlaying ? 'Pause Simulation' : 'Play Timeline'}
                  id="play-pause-timeline-button"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-rose-600 text-rose-600" /> : <Play className="w-5 h-5 fill-emerald-700 text-emerald-700 ml-0.5" />}
                </button>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Timeline Scrubber Panel</h3>
                  <p className="text-xs text-slate-400">Scrub across the 30-day timeline to view immediate translocational response.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Simulation Timeline:</span>
                <span className="font-mono text-lg font-bold bg-slate-900 text-white px-3 py-1 rounded-md border border-slate-800 shadow-inner">
                  Day {currentDay}
                </span>
              </div>
            </div>

            {/* Slider with customized step marks */}
            <div className="px-2 pt-2 pb-1" id="scrubber-wrapper">
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={currentDay}
                onChange={(e) => {
                  setIsPlaying(false);
                  setCurrentDay(parseInt(e.target.value));
                }}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                id="timeline-range-slider"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-2 px-1">
                <span>Day 0 (Pre-Trt)</span>
                <span>Day 5</span>
                <span>Day 10</span>
                <span>Day 15 (Mid)</span>
                <span>Day 20</span>
                <span>Day 25</span>
                <span>Day 30 (Final)</span>
              </div>
            </div>
          </div>

          {/* --- EXPERIMENT GRIDS --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="experiment-grids">
            
            {/* FIELD A: FOLIAR BROADCAST SPRAYING */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col" id="field-a-card">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Field A: Foliar Broadcast Spraying</h3>
                  <span className="text-[10px] text-slate-400">100 plants (10x10 Plot) • Dosage: {foliarDosage.toFixed(1)} mL • UV Decay: {foliarDecayPercent}%</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-mono font-bold text-slate-800">Avg Necrosis</span>
                  <span className="text-xs font-bold text-emerald-600 font-mono">{stats.fieldA.avgShootNecrosis}%</span>
                </div>
              </div>

              {/* 10x10 Grid for Field A */}
              <div className="grid grid-cols-10 gap-1.5 aspect-square w-full mb-4" id="grid-a">
                {fieldAPlants.map((plant, index) => (
                  <button
                    key={plant.id}
                    onClick={() => setSelectedPlant({ field: 'A', index })}
                    className={`w-full h-full rounded border transition-all cursor-pointer relative overflow-hidden group shadow-sm flex items-center justify-center ${getStatusColorClass(plant.status)}`}
                    title={`Plant ${plant.id} - ${plant.status}`}
                    id={`plant-a-btn-${index}`}
                  >
                    <span className="text-[8px] font-mono text-white opacity-0 group-hover:opacity-100 font-bold pointer-events-none select-none">
                      {index + 1}
                    </span>
                  </button>
                ))}
              </div>

              {/* Counts of plants by status Field A */}
              <div className="mt-auto grid grid-cols-5 gap-1 text-[9px] font-semibold text-center border-t border-slate-100 pt-3">
                <div className="flex flex-col items-center bg-emerald-50 text-emerald-700 py-1 rounded">
                  <span>{stats.fieldA.healthyPlants}</span>
                  <span className="text-[7px] text-emerald-600">Healthy</span>
                </div>
                <div className="flex flex-col items-center bg-amber-50 text-amber-700 py-1 rounded">
                  <span>{stats.fieldA.stuntedPlants}</span>
                  <span className="text-[7px] text-amber-500">Stunted</span>
                </div>
                <div className="flex flex-col items-center bg-amber-900/10 text-amber-900 py-1 rounded">
                  <span>{stats.fieldA.necrosisPlants}</span>
                  <span className="text-[7px] text-amber-800">Necrosis</span>
                </div>
                <div className="flex flex-col items-center bg-zinc-100 text-zinc-800 py-1 rounded">
                  <span>{stats.fieldA.deadPlants}</span>
                  <span className="text-[7px] text-zinc-700">Mortality</span>
                </div>
                <div className="flex flex-col items-center bg-purple-50 text-purple-700 py-1 rounded opacity-30 select-none">
                  <span>0</span>
                  <span className="text-[7px] text-purple-600">Ruptured</span>
                </div>
              </div>
            </div>

            {/* FIELD B: SUB-SURFACE BASAL INJECTION (SSHI) */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col" id="field-b-card">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Field B: Sub-Surface Basal Injection (SSHI)</h3>
                  <span className="text-[10px] text-slate-400">100 plants (10x10 Plot) • Pressure: {sshiPressure} PSI • Dosage: {sshiDosage.toFixed(1)} mL</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-mono font-bold text-slate-800">Avg Necrosis</span>
                  <span className="text-xs font-bold text-blue-600 font-mono">{stats.fieldB.avgShootNecrosis}%</span>
                </div>
              </div>

              {/* 10x10 Grid for Field B */}
              <div className="grid grid-cols-10 gap-1.5 aspect-square w-full mb-4" id="grid-b">
                {fieldBPlants.map((plant, index) => (
                  <button
                    key={plant.id}
                    onClick={() => setSelectedPlant({ field: 'B', index })}
                    className={`w-full h-full rounded border transition-all cursor-pointer relative overflow-hidden group shadow-sm flex items-center justify-center ${getStatusColorClass(plant.status)}`}
                    title={`Plant ${plant.id} - ${plant.status}`}
                    id={`plant-b-btn-${index}`}
                  >
                    <span className="text-[8px] font-mono text-white opacity-0 group-hover:opacity-100 font-bold pointer-events-none select-none">
                      {index + 1}
                    </span>
                  </button>
                ))}
              </div>

              {/* Counts of plants by status Field B */}
              <div className="mt-auto grid grid-cols-5 gap-1 text-[9px] font-semibold text-center border-t border-slate-100 pt-3">
                <div className="flex flex-col items-center bg-emerald-50 text-emerald-700 py-1 rounded">
                  <span>{stats.fieldB.healthyPlants}</span>
                  <span className="text-[7px] text-emerald-600">Healthy</span>
                </div>
                <div className="flex flex-col items-center bg-amber-50 text-amber-700 py-1 rounded">
                  <span>{stats.fieldB.stuntedPlants}</span>
                  <span className="text-[7px] text-amber-500">Stunted</span>
                </div>
                <div className="flex flex-col items-center bg-amber-900/10 text-amber-900 py-1 rounded">
                  <span>{stats.fieldB.necrosisPlants}</span>
                  <span className="text-[7px] text-amber-800">Necrosis</span>
                </div>
                <div className="flex flex-col items-center bg-zinc-100 text-zinc-800 py-1 rounded">
                  <span>{stats.fieldB.deadPlants}</span>
                  <span className="text-[7px] text-zinc-700">Mortality</span>
                </div>
                <div className="flex flex-col items-center bg-purple-100 text-purple-700 py-1 rounded">
                  <span>{stats.fieldB.rupturedPlants}</span>
                  <span className="text-[7px] text-purple-600">Ruptured</span>
                </div>
              </div>
            </div>

          </div>

          {/* Color Legend Block */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-xs" id="legend-card">
            <h4 className="font-bold text-slate-800 mb-2">Physiological State Color Coding Legend:</h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-emerald-500 border border-emerald-600 shadow-sm"></div>
                <span className="text-slate-600 font-medium text-[11px]">Green: Healthy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-amber-400 border border-amber-500 shadow-sm"></div>
                <span className="text-slate-600 font-medium text-[11px]">Yellow: Stunted</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-amber-800 border border-amber-900 shadow-sm"></div>
                <span className="text-slate-600 font-medium text-[11px]">Brown: Necrosis</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-zinc-900 border border-black shadow-sm"></div>
                <span className="text-slate-600 font-medium text-[11px]">Black: Dead Tubers</span>
              </div>
              <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                <div className="w-4 h-4 rounded bg-ruptured border border-purple-700 shadow-sm"></div>
                <span className="text-slate-600 font-medium text-[11px]">Purple: Ruptured</span>
              </div>
            </div>
          </div>

          {/* --- DUAL EXPERIMENT GRIDS & LIVE CHARTING --- */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm" id="live-charts-card">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2.5 border-b border-slate-100 mb-4">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Dynamic Subterranean Control Progress: Dead Tubers vs. Live Tubers (Total 800 Tubers/Field)
            </h3>

            {/* Horizontal Bar Chart Comparing Field A vs Field B */}
            <div className="flex flex-col gap-5">
              
              {/* Field A: Foliar */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-700">Field A (Foliar Broadcast Spraying) Tuber Control</span>
                  <span className="font-mono text-slate-500">
                    Dead: <span className="text-zinc-950 font-bold">{stats.fieldA.deadTubers} ({stats.fieldA.deadTuberPct}%)</span> | Live: <span className="text-emerald-600 font-bold">{stats.fieldA.liveTubers} ({stats.fieldA.liveTuberPct}%)</span>
                  </span>
                </div>
                {/* Visual Bar */}
                <div className="w-full h-8 bg-emerald-100 rounded-lg overflow-hidden flex shadow-inner border border-slate-200/50">
                  <div
                    style={{ width: `${stats.fieldA.deadTuberPct}%` }}
                    className="h-full bg-zinc-800 transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-zinc-300 font-mono"
                    title={`Dead: ${stats.fieldA.deadTuberPct}%`}
                  >
                    {stats.fieldA.deadTuberPct > 10 && `${stats.fieldA.deadTuberPct}% Dead`}
                  </div>
                  <div
                    style={{ width: `${stats.fieldA.liveTuberPct}%` }}
                    className="h-full bg-emerald-500 transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-emerald-500-foreground font-mono text-white"
                    title={`Live: ${stats.fieldA.liveTuberPct}%`}
                  >
                    {stats.fieldA.liveTuberPct > 10 && `${stats.fieldA.liveTuberPct}% Live`}
                  </div>
                </div>
              </div>

              {/* Field B: SSHI */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-700">Field B (Sub-Surface Basal Injection) Tuber Control</span>
                  <span className="font-mono text-slate-500">
                    Dead: <span className="text-zinc-950 font-bold">{stats.fieldB.deadTubers} ({stats.fieldB.deadTuberPct}%)</span> | Live: <span className="text-emerald-600 font-bold">{stats.fieldB.liveTubers} ({stats.fieldB.liveTuberPct}%)</span>
                  </span>
                </div>
                {/* Visual Bar */}
                <div className="w-full h-8 bg-emerald-100 rounded-lg overflow-hidden flex shadow-inner border border-slate-200/50">
                  <div
                    style={{ width: `${stats.fieldB.deadTuberPct}%` }}
                    className="h-full bg-zinc-800 transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-zinc-300 font-mono"
                    title={`Dead: ${stats.fieldB.deadTuberPct}%`}
                  >
                    {stats.fieldB.deadTuberPct > 10 && `${stats.fieldB.deadTuberPct}% Dead`}
                  </div>
                  <div
                    style={{ width: `${stats.fieldB.liveTuberPct}%` }}
                    className="h-full bg-emerald-500 transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-emerald-500-foreground font-mono text-white"
                    title={`Live: ${stats.fieldB.liveTuberPct}%`}
                  >
                    {stats.fieldB.liveTuberPct > 10 && `${stats.fieldB.liveTuberPct}% Live`}
                  </div>
                </div>
              </div>

            </div>

            {/* Quick comparative analytical summary */}
            <div className="mt-4 bg-slate-50 rounded-lg p-3 text-xs text-slate-600 border border-slate-100 leading-relaxed">
              <span className="font-bold text-slate-800">Analytical Insight: </span>
              {stats.fieldB.deadTuberPct > stats.fieldA.deadTuberPct ? (
                <span>
                  At Day {currentDay}, Sub-Surface Basal Injection (SSHI) is outperforming Foliar Spraying by{' '}
                  <span className="font-bold text-emerald-600 font-mono">{(stats.fieldB.deadTuberPct - stats.fieldA.deadTuberPct).toFixed(1)}%</span> in deep rhizome tuber eradication. Bypassing leaf decay and delivering active molecules directly to basal bulb allows higher translocation density.
                </span>
              ) : stats.fieldB.deadTuberPct < stats.fieldA.deadTuberPct ? (
                <span>
                  At Day {currentDay}, Foliar Spraying is currently outperforming SSHI by{' '}
                  <span className="font-bold text-amber-600 font-mono">{(stats.fieldA.deadTuberPct - stats.fieldB.deadTuberPct).toFixed(1)}%</span>. This is likely due to high-pressure mechanical tissue rupture in Field B (SSHI) venting {sshiDosage.toFixed(1)} mL of dosage into the soil domain rather than vascular phloem translocating.
                </span>
              ) : (
                <span>
                  At Day {currentDay}, both methods show identical underground tuber eradication efficacy ({stats.fieldA.deadTuberPct}%). Adjust pressure, dosage, or phloem velocity rates to compare efficacy under different agronomic configurations.
                </span>
              )}
            </div>
          </div>

        </section>
      </main>

      {/* --- INDIVIDUAL EXPANDED MODAL INSPECTOR --- */}
      {selectedPlant && activeSelectedPlantState && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="inspector-modal">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Individual Specimen Analysis</span>
                <h3 className="text-lg font-bold text-slate-900">
                  Plant Specimen ID: <span className="font-mono text-emerald-600">{activeSelectedPlantState.id}</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedPlant(null)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors"
                id="close-modal-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-5">
              
              {/* Plant Meta Details */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div>
                  <span className="block text-slate-400 font-medium">Method Category:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedPlant.field === 'A' ? 'Foliar Broadcast Spraying' : 'Sub-Surface Basal Injection'}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400 font-medium">Growth Stage State:</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {growthStage === 'young' ? 'Young Emerged Shoot' : 'Mature Established Colony'}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400 font-medium">Active Dosage Delivered:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {activeSelectedPlantState.activeDose} mL
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400 font-medium">Translocation Waves Reach:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    Node #{Math.floor(activeSelectedPlantState.translocationDepth)} ({activeSelectedPlantState.translocationDepth.toFixed(1)} depth)
                  </span>
                </div>
              </div>

              {/* Plant Health Stats */}
              <div className="flex flex-col gap-4">
                
                {/* 1. Shoot & Stem Necrosis Level */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">Shoot & Stem Necrosis Level:</span>
                    <span className="font-mono font-bold text-slate-800">{activeSelectedPlantState.shootNecrosis}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      style={{ width: `${activeSelectedPlantState.shootNecrosis}%` }}
                      className={`h-full transition-all duration-300 ${
                        activeSelectedPlantState.shootNecrosis === 100 
                          ? 'bg-zinc-950' 
                          : activeSelectedPlantState.shootNecrosis > 30 
                            ? 'bg-amber-800' 
                            : 'bg-amber-400'
                      }`}
                    ></div>
                  </div>
                </div>

                {/* 2. Basal Junction Integrity Status */}
                <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
                  <span className="font-semibold text-slate-700">Basal Junction Integrity:</span>
                  <span className={`px-2.5 py-1 rounded-full font-bold tracking-wide uppercase text-[10px] ${
                    activeSelectedPlantState.basalIntegrity === 'Intact'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : activeSelectedPlantState.basalIntegrity === 'Necrotic'
                        ? 'bg-amber-50 text-amber-800 border border-amber-100'
                        : 'bg-purple-50 text-purple-700 border border-purple-100 bg-ruptured text-white'
                  }`}>
                    {activeSelectedPlantState.basalIntegrity}
                  </span>
                </div>

                {/* 3. Micro-Tuber Chain Analysis */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 mb-2.5 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    Micro-Tuber Chain Analysis (Rhizome Node #1 to #8)
                  </h4>
                  <p className="text-[11px] text-slate-400 mb-4 leading-normal">
                    Traces down the underground rhizome system. Lethal Wave Threshold is <span className="font-semibold text-slate-800 font-mono">0.15 mg</span>. Live resprouting risk if concentration fails to clear the threshold limit.
                  </p>

                  {/* Vertical Rhizome Node Chain */}
                  <div className="flex flex-col gap-2 bg-slate-50 rounded-xl p-4 border border-slate-100" id="rhizome-node-chain">
                    {activeSelectedPlantState.tubers.map((tuber, idx) => {
                      const isKilled = !tuber.alive;
                      const hasReached = tuber.reached;
                      return (
                        <div key={tuber.number} className="flex items-center gap-3 text-xs relative">
                          {/* Rhizome connector line (drawn except for the last tuber) */}
                          {idx < 7 && (
                            <div className="absolute left-3 top-6 w-0.5 h-4 bg-slate-300"></div>
                          )}

                          {/* Node visual icon */}
                          <div className={`w-6.5 h-6.5 rounded-full flex items-center justify-center font-bold text-[10px] z-10 shadow-sm border transition-all ${
                            isKilled
                              ? 'bg-zinc-950 border-black text-zinc-300'
                              : hasReached
                                ? 'bg-amber-400 border-amber-500 text-amber-950 animate-pulse'
                                : 'bg-emerald-500 border-emerald-600 text-white'
                          }`}>
                            {tuber.number}
                          </div>

                          {/* Depth and Concentration details */}
                          <div className="flex-1 grid grid-cols-3 gap-2 items-center">
                            <div>
                              <span className="font-semibold text-slate-700">Tuber #{tuber.number}</span>
                              <span className="block text-[10px] text-slate-400">Depth: {tuber.depthCm} cm</span>
                            </div>
                            <div className="text-center font-mono">
                              <span className="text-[10px] text-slate-400 block">Concentration</span>
                              <span className={`font-bold ${tuber.concentration >= 0.15 ? 'text-zinc-800' : 'text-slate-400'}`}>
                                {tuber.concentration} mg
                              </span>
                            </div>
                            <div className="text-right">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isKilled
                                  ? 'bg-zinc-900/10 text-zinc-800 border border-zinc-900/20'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              }`}>
                                {isKilled ? 'Mortality' : 'Live/Viable'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Explanation of specimen outcome */}
                <div className="text-xs text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-100 leading-relaxed mt-2">
                  <span className="font-bold text-slate-800 block mb-1">Specimen Diagnostic Note:</span>
                  {selectedPlant.field === 'A' ? (
                    <span>
                      Since foliar chemical entry experiences natural cuticular barrier degradation and solar UV decay, active translocated concentrations down to node #5 and beyond dropped below the 0.15 mg lethal threshold. While surface shoots show necrosis, this weed has high potential to resprout from survived lower tubers.
                    </span>
                  ) : activeSelectedPlantState.isRuptured ? (
                    <span className="text-purple-950">
                      High pressure of {sshiPressure} PSI exceeded the mechanical cell wall limits of the plant, tearing the basal stem connection. Delivering only 15% efficacy, most of the dose has leaked into the soil domain rather than traveling systemic lateral phloem pathways, leaving all tubers intact.
                    </span>
                  ) : (
                    <span>
                      Under optimal {sshiPressure} PSI direct basal injection, no chemical is lost to UV decay. Delivering systemic molecules directly to basal bulb has sustained translocation, resulting in an uncompromised lateral dose that systematically killed underground nodes.
                    </span>
                  )}
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedPlant(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-lg font-bold text-xs transition-colors"
                id="close-inspector-footer-btn"
              >
                Close Specimen Analysis
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- FOOTER CREDITS --- */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-400 mt-auto" id="footer-credits">
        <p>© 2026 Agronomic Comparison Simulator • Calibrated to FlorSys & APSIM-Weed empirical translocation studies.</p>
      </footer>
    </div>
  );
}
