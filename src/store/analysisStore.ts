import { create } from 'zustand';
import type {
  Particle, InvariantMassPair, HistogramData,
  DecayChannelKey, MassHistogramChannel, ChannelLabel, PeakCandidate,
} from '@/types/physics';
import { ParticleType } from '@/types/physics';
import { invariantMass, deltaR, deltaPhi, deltaEta } from '@/services/physics/kinematics';
import { buildHistogram } from '@/services/analysis/histogram';

export const CHANNEL_LABELS: Record<DecayChannelKey, ChannelLabel> = {
  ee: {
    key: 'ee', name: 'e⁺e⁻ 电子对', shortName: 'ee',
    color: '#00F5D4',
    particleTypes: [ParticleType.ELECTRON, ParticleType.ELECTRON],
  },
  mumu: {
    key: 'mumu', name: 'μ⁺μ⁻ 缪子对', shortName: 'μμ',
    color: '#FEE440',
    particleTypes: [ParticleType.MUON, ParticleType.MUON],
  },
  gammagamma: {
    key: 'gammagamma', name: 'γγ 光子对', shortName: 'γγ',
    color: '#F15BB5',
    particleTypes: [ParticleType.PHOTON, ParticleType.PHOTON],
  },
  tautau: {
    key: 'tautau', name: 'τ⁺τ⁻ τ子对', shortName: 'ττ',
    color: '#9B5DE5',
    particleTypes: [ParticleType.TAU, ParticleType.TAU],
  },
  bb: {
    key: 'bb', name: 'b-b̄ 底夸克对', shortName: 'bb̄',
    color: '#00BBF9',
    particleTypes: [ParticleType.BQUARK, ParticleType.BQUARK],
  },
  ll: {
    key: 'll', name: 'ℓ⁺ℓ⁻ 任意轻子对', shortName: 'ℓℓ',
    color: '#06D6A0',
    particleTypes: null,
  },
  jj: {
    key: 'jj', name: '双喷注', shortName: 'jj',
    color: '#FAA307',
    particleTypes: [ParticleType.JET, ParticleType.JET],
  },
  custom: {
    key: 'custom', name: '自定义混合对', shortName: '混合',
    color: '#EF476F',
    particleTypes: null,
  },
};

interface AnalysisState {
  selectedPairs: InvariantMassPair[];
  massHistogram: HistogramData | null;
  activeHistogramType: 'mass' | 'pt' | 'eta' | 'energy' | 'met';
  channels: Record<DecayChannelKey, MassHistogramChannel>;
  activeChannel: DecayChannelKey;
  peakCandidates: PeakCandidate[];
  autoChannelSeparation: boolean;
  showAllChannelsInHistogram: boolean;
  get canComputeMass(): boolean;
  get selectedParticlesForMass(): Particle[];
  get channelKeys(): DecayChannelKey[];
  addMassPairFromSelection: () => void;
  addPair: (p1: Particle, p2: Particle, eventId?: number) => void;
  removePair: (index: number, channelKey?: DecayChannelKey) => void;
  clearPairs: () => void;
  buildHistogram: (
    type?: 'mass' | 'pt' | 'eta' | 'energy' | 'met',
    bins?: number, xMin?: number, xMax?: number, particles?: Particle[],
  ) => void;
  rebuildAllChannelHistograms: (bins?: number, xMin?: number, xMax?: number) => void;
  clearAnalysis: () => void;
  setActiveHistogramType: (type: 'mass' | 'pt' | 'eta' | 'energy' | 'met') => void;
  setActiveChannel: (key: DecayChannelKey) => void;
  toggleShowAllChannels: () => void;
  findPeakEvents: (sigmaThreshold?: number) => PeakCandidate[];
  gotoPeakEvent: (peak: PeakCandidate) => void;
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

function emptyChannels(): Record<DecayChannelKey, MassHistogramChannel> {
  const r = {} as Record<DecayChannelKey, MassHistogramChannel>;
  (Object.keys(CHANNEL_LABELS) as DecayChannelKey[]).forEach(k => {
    r[k] = {
      key: k,
      label: CHANNEL_LABELS[k],
      pairs: [],
      histogram: null,
      peakEvents: [],
    };
  });
  return r;
}

export function classifyChannel(p1: Particle, p2: Particle): DecayChannelKey {
  const t1 = p1.type;
  const t2 = p2.type;
  if (t1 === ParticleType.ELECTRON && t2 === ParticleType.ELECTRON && p1.charge * p2.charge <= 0) return 'ee';
  if (t1 === ParticleType.MUON && t2 === ParticleType.MUON && p1.charge * p2.charge <= 0) return 'mumu';
  if (t1 === ParticleType.PHOTON && t2 === ParticleType.PHOTON) return 'gammagamma';
  if (t1 === ParticleType.TAU && t2 === ParticleType.TAU) return 'tautau';
  if (t1 === ParticleType.BQUARK && t2 === ParticleType.BQUARK) return 'bb';
  const lepton = [ParticleType.ELECTRON, ParticleType.MUON, ParticleType.TAU];
  if (lepton.includes(t1) && lepton.includes(t2)) return 'll';
  if (t1 === ParticleType.JET && t2 === ParticleType.JET) return 'jj';
  return 'custom';
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  selectedPairs: [],
  massHistogram: null,
  activeHistogramType: 'mass',
  channels: emptyChannels(),
  activeChannel: 'ee',
  peakCandidates: [],
  autoChannelSeparation: true,
  showAllChannelsInHistogram: false,

  get selectedParticlesForMass() {
    return [];
  },

  get canComputeMass() {
    return get().selectedPairs.length > 0;
  },

  get channelKeys() {
    return (Object.keys(CHANNEL_LABELS) as DecayChannelKey[]).filter(
      k => get().channels[k].pairs.length > 0 || k === 'ee'
    );
  },

  addMassPairFromSelection: () => {},

  addPair: (p1: Particle, p2: Particle, eventId?: number) => {
    const m = invariantMass(p1, p2);
    const dr = deltaR(p1, p2);
    const dp = deltaPhi(p1.phi, p2.phi);
    const de = deltaEta(p1.eta, p2.eta);
    const pair: InvariantMassPair = {
      id: `${p1.id}-${p2.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      particle1: p1, particle2: p2,
      invariantMass: m, deltaR: dr, deltaPhi: dp, deltaEta: de,
    };
    const chKey = get().autoChannelSeparation ? classifyChannel(p1, p2) : 'custom';
    set(state => {
      const channels = { ...state.channels };
      const ch = { ...channels[chKey] };
      ch.pairs = [...ch.pairs, pair];
      if (eventId !== undefined) {
        ch.peakEvents = [...ch.peakEvents, { eventId, pairId: pair.id, mass: m, deltaR: dr }];
      }
      channels[chKey] = ch;
      return {
        selectedPairs: [...state.selectedPairs, pair],
        activeChannel: chKey,
        channels,
      };
    });
    setTimeout(() => get().buildHistogram('mass'), 0);
    setTimeout(() => get().rebuildAllChannelHistograms(), 10);
  },

  removePair: (index: number, channelKey?: DecayChannelKey) => {
    set(state => {
      let target = state.selectedPairs[index];
      if (channelKey) {
        const ch = state.channels[channelKey];
        target = ch.pairs[index] ?? target;
      }
      if (!target) return state;
      const selectedPairs = state.selectedPairs.filter(p => p.id !== target!.id);
      const channels = { ...state.channels };
      (Object.keys(channels) as DecayChannelKey[]).forEach(k => {
        if (channels[k].pairs.some(p => p.id === target!.id)) {
          channels[k] = {
            ...channels[k],
            pairs: channels[k].pairs.filter(p => p.id !== target!.id),
            peakEvents: channels[k].peakEvents.filter(ev => ev.pairId !== target!.id),
          };
        }
      });
      return { selectedPairs, channels };
    });
    setTimeout(() => {
      const s = get();
      if (s.selectedPairs.length > 0) s.buildHistogram('mass');
      else set({ massHistogram: null });
      s.rebuildAllChannelHistograms();
    }, 0);
  },

  clearPairs: () => set({
    selectedPairs: [],
    massHistogram: null,
    channels: emptyChannels(),
    peakCandidates: [],
  }),

  buildHistogram: (
    type: 'mass' | 'pt' | 'eta' | 'energy' | 'met' = 'mass',
    bins: number = 50, xMin?: number, xMax?: number, particles?: Particle[],
  ) => {
    let data: number[] = [];
    const state = get();
    switch (type) {
      case 'mass':
        data = state.channels[state.activeChannel].pairs.length > 0
          ? state.channels[state.activeChannel].pairs.map(p => p.invariantMass)
          : state.selectedPairs.map(p => p.invariantMass);
        break;
      case 'pt': data = (particles || []).map(p => p.pt); break;
      case 'eta': data = (particles || []).map(p => p.eta); break;
      case 'energy': data = (particles || []).map(p => p.energy); break;
      case 'met': data = []; break;
    }
    if (data.length === 0) {
      if (type === state.activeHistogramType) set({ massHistogram: null });
      return;
    }
    const hist = buildHistogram(data, bins, xMin, xMax, {
      title: histTitle[type], xLabel: histXLabel[type], yLabel: 'Entries',
    });
    set({ massHistogram: hist, activeHistogramType: type });
  },

  rebuildAllChannelHistograms: (bins: number = 50, xMin?: number, xMax?: number) => {
    set(state => {
      const channels = { ...state.channels };
      (Object.keys(channels) as DecayChannelKey[]).forEach(k => {
        const masses = channels[k].pairs.map(p => p.invariantMass);
        if (masses.length === 0) {
          channels[k] = { ...channels[k], histogram: null };
          return;
        }
        channels[k] = {
          ...channels[k],
          histogram: buildHistogram(masses, bins, xMin, xMax, {
            title: `${CHANNEL_LABELS[k].name} - ${histTitle.mass}`,
            xLabel: histXLabel.mass, yLabel: 'Entries',
          }),
        };
      });
      return { channels };
    });
  },

  clearAnalysis: () => set({
    selectedPairs: [], massHistogram: null,
    channels: emptyChannels(), peakCandidates: [],
  }),

  setActiveHistogramType: (type) => set({ activeHistogramType: type }),

  setActiveChannel: (key) => {
    set({ activeChannel: key });
    setTimeout(() => get().buildHistogram('mass'), 0);
  },

  toggleShowAllChannels: () =>
    set(s => ({ showAllChannelsInHistogram: !s.showAllChannelsInHistogram })),

  findPeakEvents: (sigmaThreshold: number = 2.0) => {
    const peaks: PeakCandidate[] = [];
    const state = get();
    (Object.keys(state.channels) as DecayChannelKey[]).forEach(k => {
      const ch = state.channels[k];
      if (!ch.histogram || ch.pairs.length < 5) return;
      const h = ch.histogram;
      const mean = h.mean, std = h.rms || 1;
      h.bins.forEach((count, idx) => {
        const center = (h.binEdges[idx] + h.binEdges[idx + 1]) / 2;
        const expected = Math.max(1, h.entries / h.bins.length);
        if (count > expected + sigmaThreshold * Math.sqrt(expected) && count >= 3) {
          ch.pairs
            .filter(p => p.invariantMass >= h.binEdges[idx] && p.invariantMass < h.binEdges[idx + 1])
            .forEach(p => {
              const ev = ch.peakEvents.find(e => e.pairId === p.id);
              if (ev) peaks.push({
                eventId: ev.eventId, pairId: p.id,
                mass: p.invariantMass, deltaR: p.deltaR,
                histogramKey: k, binIndex: idx,
              });
            });
        }
      });
      void mean; void std;
    });
    set({ peakCandidates: peaks });
    return peaks;
  },

  gotoPeakEvent: (peak: PeakCandidate) => {
    const store = (window as any).__EVENT_STORE__;
    if (store && typeof store.gotoEvent === 'function') {
      store.gotoEvent(peak.eventId);
    }
  },
}));
