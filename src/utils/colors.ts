import { ParticleType } from '@/types/physics';

export const PARTICLE_COLORS: Record<ParticleType, string> = {
  [ParticleType.ELECTRON]: '#00D4FF',
  [ParticleType.MUON]: '#FF4081',
  [ParticleType.PHOTON]: '#FFD54F',
  [ParticleType.JET]: '#FF6D00',
  [ParticleType.TAU]: '#B388FF',
  [ParticleType.BQUARK]: '#69F0AE',
};

export const PARTICLE_NAMES: Record<ParticleType, string> = {
  [ParticleType.ELECTRON]: '电子 e±',
  [ParticleType.MUON]: '缪子 μ±',
  [ParticleType.PHOTON]: '光子 γ',
  [ParticleType.JET]: '喷注 Jet',
  [ParticleType.TAU]: 'τ 子',
  [ParticleType.BQUARK]: 'B-强子',
};

export const PARTICLE_SYMBOLS: Record<ParticleType, string> = {
  [ParticleType.ELECTRON]: 'e',
  [ParticleType.MUON]: 'μ',
  [ParticleType.PHOTON]: 'γ',
  [ParticleType.JET]: 'J',
  [ParticleType.TAU]: 'τ',
  [ParticleType.BQUARK]: 'B',
};

export const PARTICLE_MASSES: Record<ParticleType, number> = {
  [ParticleType.ELECTRON]: 0.000511,
  [ParticleType.MUON]: 0.105658,
  [ParticleType.PHOTON]: 0.0,
  [ParticleType.JET]: 0.0,
  [ParticleType.TAU]: 1.77686,
  [ParticleType.BQUARK]: 4.18,
};

export const PARTICLE_LINE_STYLES: Record<ParticleType, 'solid' | 'dashed' | 'dotted' | 'none'> = {
  [ParticleType.ELECTRON]: 'solid',
  [ParticleType.MUON]: 'dashed',
  [ParticleType.PHOTON]: 'dotted',
  [ParticleType.JET]: 'none',
  [ParticleType.TAU]: 'dashed',
  [ParticleType.BQUARK]: 'solid',
};

export const PARTICLE_LINE_WIDTHS: Record<ParticleType, number> = {
  [ParticleType.ELECTRON]: 1.5,
  [ParticleType.MUON]: 1.2,
  [ParticleType.PHOTON]: 1.0,
  [ParticleType.JET]: 0,
  [ParticleType.TAU]: 1.2,
  [ParticleType.BQUARK]: 1.5,
};

export const HEATMAP_COLORMAP: string[] = [
  '#000033',
  '#001166',
  '#003399',
  '#0066CC',
  '#0099FF',
  '#33CCFF',
  '#66FFFF',
  '#99FFCC',
  '#CCFF66',
  '#FFFF00',
  '#FFCC00',
  '#FF9900',
  '#FF6600',
  '#FF3300',
  '#CC0000',
];

export const DETECTOR_LAYER_COLORS: Record<string, string> = {
  pixel: '#4A6FA5',
  sct: '#5C821A',
  trt: '#C46352',
  em_calo: '#9B5DE5',
  had_calo: '#F15BB5',
  muon_chamber: '#00BBF9',
};

export function viridisColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const idx = Math.floor(clamped * (HEATMAP_COLORMAP.length - 1));
  return HEATMAP_COLORMAP[idx];
}

export function logNormalize(value: number, max: number): number {
  if (max <= 0) return 0;
  const v = Math.log(Math.max(1e-10, value) + 1) / Math.log(max + 1);
  return Math.max(0, Math.min(1, v));
}
