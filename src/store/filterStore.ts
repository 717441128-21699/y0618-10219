import { create } from 'zustand';
import type { Particle, PhysicsEvent } from '@/types/physics';
import { ParticleType } from '@/types/physics';

interface FilterState {
  ptThreshold: number;
  etaRange: [number, number];
  energyRange: [number, number];
  visibleParticleTypes: Set<ParticleType>;
  showOnlySignal: boolean;
  showCharge: 'all' | 'positive' | 'negative' | 'neutral';
  minTrackPoints: number;
  getFilteredParticles: (event: PhysicsEvent | null) => Particle[];
  isParticleVisible: (p: Particle) => boolean;
  setPtThreshold: (v: number) => void;
  setEtaRange: (range: [number, number]) => void;
  setEnergyRange: (range: [number, number]) => void;
  toggleParticleType: (type: ParticleType) => void;
  setAllParticleTypes: (visible: boolean) => void;
  setShowOnlySignal: (v: boolean) => void;
  setShowCharge: (v: 'all' | 'positive' | 'negative' | 'neutral') => void;
  setMinTrackPoints: (v: number) => void;
  resetFilters: () => void;
}

const DEFAULT_TYPES = new Set<ParticleType>([
  ParticleType.ELECTRON,
  ParticleType.MUON,
  ParticleType.PHOTON,
  ParticleType.JET,
  ParticleType.TAU,
  ParticleType.BQUARK,
]);

export const useFilterStore = create<FilterState>((set, get) => ({
  ptThreshold: 0.5,
  etaRange: [-5, 5],
  energyRange: [0, 10000],
  visibleParticleTypes: new Set(DEFAULT_TYPES),
  showOnlySignal: false,
  showCharge: 'all',
  minTrackPoints: 0,

  isParticleVisible: (p: Particle) => {
    const state = get();
    if (p.pt < state.ptThreshold) return false;
    if (p.eta < state.etaRange[0] || p.eta > state.etaRange[1]) return false;
    if (p.energy < state.energyRange[0] || p.energy > state.energyRange[1]) return false;
    if (!state.visibleParticleTypes.has(p.type)) return false;
    if (state.showOnlySignal && !p.isSignal) return false;
    if (p.trackPoints.length < state.minTrackPoints) return false;
    switch (state.showCharge) {
      case 'positive':
        if (p.charge <= 0) return false;
        break;
      case 'negative':
        if (p.charge >= 0) return false;
        break;
      case 'neutral':
        if (p.charge !== 0) return false;
        break;
    }
    return true;
  },

  getFilteredParticles: (event: PhysicsEvent | null) => {
    if (!event) return [];
    const isVis = get().isParticleVisible;
    return event.particles.filter(isVis);
  },

  setPtThreshold: (v) => set({ ptThreshold: v }),
  setEtaRange: (range) => set({ etaRange: range }),
  setEnergyRange: (range) => set({ energyRange: range }),

  toggleParticleType: (type) => {
    const next = new Set(get().visibleParticleTypes);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    set({ visibleParticleTypes: next });
  },

  setAllParticleTypes: (visible) => {
    if (visible) {
      set({ visibleParticleTypes: new Set(DEFAULT_TYPES) });
    } else {
      set({ visibleParticleTypes: new Set() });
    }
  },

  setShowOnlySignal: (v) => set({ showOnlySignal: v }),
  setShowCharge: (v) => set({ showCharge: v }),
  setMinTrackPoints: (v) => set({ minTrackPoints: v }),

  resetFilters: () => {
    set({
      ptThreshold: 0.5,
      etaRange: [-5, 5],
      energyRange: [0, 10000],
      visibleParticleTypes: new Set(DEFAULT_TYPES),
      showOnlySignal: false,
      showCharge: 'all',
      minTrackPoints: 0,
    });
  },
}));
