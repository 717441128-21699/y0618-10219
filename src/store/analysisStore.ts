import { create } from 'zustand';
import type { Particle, InvariantMassPair, HistogramData } from '@/types/physics';
import { invariantMass, deltaR, deltaPhi, deltaEta } from '@/services/physics/kinematics';
import { buildHistogram } from '@/services/analysis/histogram';

interface AnalysisState {
  selectedPairs: InvariantMassPair[];
  massHistogram: HistogramData | null;
  activeHistogramType: 'mass' | 'pt' | 'eta' | 'energy' | 'met';
  get canComputeMass(): boolean;
  get selectedParticlesForMass(): Particle[];
  addMassPairFromSelection: () => void;
  addPair: (p1: Particle, p2: Particle) => void;
  removePair: (index: number) => void;
  clearPairs: () => void;
  buildHistogram: (
    type?: 'mass' | 'pt' | 'eta' | 'energy' | 'met',
    bins?: number,
    xMin?: number,
    xMax?: number,
    particles?: Particle[],
  ) => void;
  clearAnalysis: () => void;
  setActiveHistogramType: (type: 'mass' | 'pt' | 'eta' | 'energy' | 'met') => void;
}

const histTitle: Record<string, string> = {
  mass: '双粒子不变质量分布',
  pt: '横动量 pT 分布',
  eta: '赝快度 η 分布',
  energy: '粒子能量分布',
  met: '丢失横能量 MET 分布',
};

const histXLabel: Record<string, string> = {
  mass: 'M [GeV/c²]',
  pt: 'pT [GeV/c]',
  eta: 'η',
  energy: 'E [GeV]',
  met: 'MET [GeV]',
};

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  selectedPairs: [],
  massHistogram: null,
  activeHistogramType: 'mass',

  get selectedParticlesForMass() {
    return [];
  },

  get canComputeMass() {
    return get().selectedPairs.length > 0;
  },

  addMassPairFromSelection: () => {},

  addPair: (p1: Particle, p2: Particle) => {
    const m = invariantMass(p1, p2);
    const dr = deltaR(p1, p2);
    const dp = deltaPhi(p1.phi, p2.phi);
    const de = deltaEta(p1.eta, p2.eta);
    const pair: InvariantMassPair = {
      id: `${p1.id}-${p2.id}-${Date.now()}`,
      particle1: p1,
      particle2: p2,
      invariantMass: m,
      deltaR: dr,
      deltaPhi: dp,
      deltaEta: de,
    };
    const pairs = [...get().selectedPairs, pair];
    set({ selectedPairs: pairs });
    if (pairs.length >= 1) {
      get().buildHistogram('mass');
    }
  },

  removePair: (index: number) => {
    const pairs = get().selectedPairs.filter((_, i) => i !== index);
    set({ selectedPairs: pairs });
    if (pairs.length > 0) {
      get().buildHistogram('mass');
    } else {
      set({ massHistogram: null });
    }
  },

  clearPairs: () => set({ selectedPairs: [], massHistogram: null }),

  buildHistogram: (
    type: 'mass' | 'pt' | 'eta' | 'energy' | 'met' = 'mass',
    bins: number = 50,
    xMin?: number,
    xMax?: number,
    particles?: Particle[],
  ) => {
    let data: number[] = [];
    const state = get();

    switch (type) {
      case 'mass':
        data = state.selectedPairs.map(p => p.invariantMass);
        break;
      case 'pt':
        data = (particles || []).map(p => p.pt);
        break;
      case 'eta':
        data = (particles || []).map(p => p.eta);
        break;
      case 'energy':
        data = (particles || []).map(p => p.energy);
        break;
      case 'met':
        data = [];
        break;
    }

    if (data.length === 0) {
      if (type === state.activeHistogramType) {
        set({ massHistogram: null });
      }
      return;
    }

    const hist = buildHistogram(data, bins, xMin, xMax, {
      title: histTitle[type],
      xLabel: histXLabel[type],
      yLabel: 'Entries',
    });
    set({ massHistogram: hist, activeHistogramType: type });
  },

  clearAnalysis: () => {
    set({
      selectedPairs: [],
      massHistogram: null,
    });
  },

  setActiveHistogramType: (type) => {
    set({ activeHistogramType: type });
  },
}));
