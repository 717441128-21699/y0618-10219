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

export type ParticleField =
  | 'px' | 'py' | 'pz' | 'energy'
  | 'eta' | 'phi' | 'pt'
  | 'charge' | 'pdgId' | 'mass'
  | 'vx' | 'vy' | 'vz';

export type EventMetaField = 'runNumber' | 'luminosityBlock' | 'eventId';

export const REQUIRED_PARTICLE_FIELDS: ParticleField[] = ['px', 'py', 'pz', 'energy'];
export const RECOMMENDED_PARTICLE_FIELDS: ParticleField[] = ['eta', 'phi', 'pt', 'charge', 'pdgId', 'mass'];
export const EVENT_META_FIELDS: EventMetaField[] = ['runNumber', 'luminosityBlock', 'eventId'];

export const EVENT_META_ALIASES: Record<EventMetaField, string[]> = {
  runNumber: ['runNumber', 'RunNumber', 'run', 'Run', 'runNum', 'run_number', 'nRun', 'runNo', 'run_id'],
  luminosityBlock: ['luminosityBlock', 'LumiBlock', 'lumiBlock', 'lb', 'lbNumber', 'lumi', 'lumi_block', 'lumiId'],
  eventId: ['eventId', 'EventNumber', 'eventNumber', 'evt', 'event', 'evtNum', 'event_number', 'nEvent', 'evtNo', 'event_id'],
};

export interface BranchMapping {
  particleField: ParticleField;
  branchName: string | null;
  required: boolean;
  validated: boolean;
  error?: string;
  sampleValues?: (number | string)[];
  dtype?: string;
}

export interface MetaBranchMapping {
  metaField: EventMetaField;
  branchName: string | null;
  sampleValues?: (number | string)[];
  dtype?: string;
}

export interface EventBranchInfo {
  name: string;
  type: 'scalar' | 'vector' | 'jagged';
  dtype: string;
  sampleValues?: any[];
  nullCount?: number;
  description?: string;
}

export interface ParseValidationReport {
  ok: boolean;
  errors: { severity: 'error' | 'warning' | 'info'; message: string; field?: ParticleField }[];
  eventCount: number;
  particleCountPerEvent: number[];
  fileBranches: EventBranchInfo[];
  previewParticles: Particle[];
}

export type DecayChannelKey =
  | 'ee'       // 电子对 (e+ e-)
  | 'mumu'     // 缪子对 (μ+ μ-)
  | 'gammagamma' // 光子对 (γγ)
  | 'tautau'   // τ 对
  | 'bb'       // 底夸克对
  | 'll'       // 任意轻子对
  | 'jj'       // 喷注对
  | 'custom';  // 自定义混合对

export interface ChannelLabel {
  key: DecayChannelKey;
  name: string;
  shortName: string;
  color: string;
  particleTypes: [ParticleType, ParticleType] | null; // null 表示混合
}

export interface MassHistogramChannel {
  key: DecayChannelKey;
  label: ChannelLabel;
  pairs: InvariantMassPair[];
  histogram: HistogramData | null;
  peakEvents: Array<{ eventId: number; pairId: string; mass: number; deltaR?: number }>;
}

export interface PeakCandidate {
  eventId: number;
  pairId: string;
  mass: number;
  deltaR: number;
  histogramKey: DecayChannelKey;
  binIndex: number;
}

export type FieldSource = 'file' | 'derived';

export interface ParticleWithSource extends Particle {
  fieldSources: Partial<Record<ParticleField, FieldSource>>;
  rawBranchNames: Partial<Record<ParticleField, string>>;
}

export interface BranchMappingPreset {
  id: string;
  name: string;
  format: 'root' | 'hdf5';
  createdAt: number;
  particleMappings: Array<{ particleField: ParticleField; branchName: string | null }>;
  metaMappings: Array<{ metaField: EventMetaField; branchName: string | null }>;
}

export interface PhysicsEventWithMeta extends PhysicsEvent {
  rawEventId?: number;
  rawRunNumber?: number;
  rawLuminosityBlock?: number;
  eventIdSource: FieldSource;
  runNumberSource: FieldSource;
  luminosityBlockSource: FieldSource;
}
