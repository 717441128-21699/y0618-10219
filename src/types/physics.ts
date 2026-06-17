export enum ParticleType {
  ELECTRON = 'electron',
  MUON = 'muon',
  PHOTON = 'photon',
  JET = 'jet',
  TAU = 'tau',
  BQUARK = 'bquark',
}

export enum DetectorLayer {
  PIXEL = 'pixel',
  SCT = 'sct',
  TRT = 'trt',
  EM_CALO = 'em_calo',
  HAD_CALO = 'had_calo',
  MUON_CHAMBER = 'muon_chamber',
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Vertex {
  x: number;
  y: number;
  z: number;
}

export interface Particle {
  id: number;
  type: ParticleType;
  charge: number;
  px: number;
  py: number;
  pz: number;
  energy: number;
  eta: number;
  phi: number;
  pt: number;
  mass: number;
  trackPoints: Vector3[];
  vertex: Vertex;
  isSignal: boolean;
}

export interface EnergyDeposit {
  detectorId: number;
  layer: DetectorLayer;
  eta: number;
  phi: number;
  z: number;
  energy: number;
}

export interface PhysicsEvent {
  eventId: number;
  runNumber: number;
  luminosityBlock: number;
  timestamp: number;
  particles: Particle[];
  energyDeposits: EnergyDeposit[];
  totalET: number;
  missingET: {
    et: number;
    phi: number;
  };
}

export interface InvariantMassPair {
  id: string;
  particle1: Particle;
  particle2: Particle;
  invariantMass: number;
  deltaR: number;
  deltaPhi: number;
  deltaEta: number;
}

export interface HistogramData {
  title: string;
  xLabel: string;
  yLabel: string;
  bins: number[];
  binEdges: number[];
  binWidth: number;
  xMin: number;
  xMax: number;
  entries: number;
  mean: number;
  rms: number;
  underflow: number;
  overflow: number;
}

export interface HistogramBin {
  x: number;
  y: number;
  xMin: number;
  xMax: number;
}
