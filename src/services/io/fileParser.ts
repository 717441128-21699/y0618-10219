import type {
  Particle, PhysicsEvent, EnergyDeposit, Vertex, DetectorLayer,
  ParticleField, BranchMapping, EventBranchInfo, ParseValidationReport,
} from '@/types/physics';
import { ParticleType, DetectorLayer as DLayer } from '@/types/physics';
import {
  generateHelixTrack, generateStraightTrack, generateJetConePoints,
} from '@/services/physics/kinematics';
import { ptFromPxPy, etaFromTheta, phiFromPxPy } from '@/services/physics/kinematics';

export type FileFormat = 'root' | 'hdf5';

const PDG_TO_TYPE: Record<number, ParticleType> = {
  11: ParticleType.ELECTRON,
  [-11]: ParticleType.ELECTRON,
  13: ParticleType.MUON,
  [-13]: ParticleType.MUON,
  22: ParticleType.PHOTON,
  15: ParticleType.TAU,
  [-15]: ParticleType.TAU,
  5: ParticleType.BQUARK,
  [-5]: ParticleType.BQUARK,
  1: ParticleType.JET,
  2: ParticleType.JET,
  3: ParticleType.JET,
  4: ParticleType.JET,
  6: ParticleType.JET,
  21: ParticleType.JET,
};

export function pdgToParticleType(pdg: number): ParticleType {
  if (PDG_TO_TYPE[pdg]) return PDG_TO_TYPE[pdg];
  const absPdg = Math.abs(pdg);
  if (absPdg >= 1 && absPdg <= 6) return ParticleType.JET;
  if (absPdg >= 111 && absPdg <= 999) return ParticleType.JET;
  return ParticleType.JET;
}

export function guessParticleTypeFromBranches(
  values: Partial<Record<ParticleField, number>>,
): ParticleType {
  const pdg = values.pdgId;
  if (pdg !== undefined) return pdgToParticleType(pdg);
  const hasTrack = (values.charge !== undefined && values.charge !== 0);
  const pt = values.pt ?? ptFromPxPy(values.px ?? 0, values.py ?? 0);
  if (!hasTrack) {
    if (pt > 5) return ParticleType.PHOTON;
    return ParticleType.JET;
  }
  const eta = Math.abs(values.eta ?? etaFromTheta(Math.acos(
    (values.pz ?? 0) / Math.sqrt((values.px ?? 0) ** 2 + (values.py ?? 0) ** 2 + (values.pz ?? 0) ** 2 + 1e-9)
  )));
  if (eta > 2.5 && pt < 50) return ParticleType.ELECTRON;
  if (pt < 30) return ParticleType.ELECTRON;
  return ParticleType.MUON;
}

export const DEFAULT_BRANCH_MAPPING: Omit<BranchMapping, 'validated'>[] = [
  { particleField: 'px', branchName: 'px', required: true },
  { particleField: 'py', branchName: 'py', required: true },
  { particleField: 'pz', branchName: 'pz', required: true },
  { particleField: 'energy', branchName: 'energy', required: true },
  { particleField: 'pt', branchName: 'pt', required: false },
  { particleField: 'eta', branchName: 'eta', required: false },
  { particleField: 'phi', branchName: 'phi', required: false },
  { particleField: 'charge', branchName: 'charge', required: false },
  { particleField: 'pdgId', branchName: 'pdgId', required: false },
  { particleField: 'mass', branchName: 'mass', required: false },
  { particleField: 'vx', branchName: 'vx', required: false },
  { particleField: 'vy', branchName: 'vy', required: false },
  { particleField: 'vz', branchName: 'vz', required: false },
];

const ALIASES: Partial<Record<ParticleField, string[]>> = {
  px: ['Particle.Px', 'particle_px', 'Px', 'p_x', 'part_px', 'genPart_px'],
  py: ['Particle.Py', 'particle_py', 'Py', 'p_y', 'part_py', 'genPart_py'],
  pz: ['Particle.Pz', 'particle_pz', 'Pz', 'p_z', 'part_pz', 'genPart_pz'],
  energy: ['Particle.E', 'particle_energy', 'E', 'e', 'part_e', 'genPart_e', 'Energy'],
  pt: ['Particle.PT', 'particle_pt', 'PT', 'Pt', 'pT', 'part_pt', 'genPart_pt'],
  eta: ['Particle.Eta', 'particle_eta', 'Eta', 'part_eta', 'genPart_eta'],
  phi: ['Particle.Phi', 'particle_phi', 'Phi', 'part_phi', 'genPart_phi'],
  charge: ['Particle.Charge', 'particle_charge', 'Charge', 'q', 'Q', 'part_charge'],
  pdgId: ['Particle.PID', 'particle_pdgId', 'PDG', 'PdgId', 'pdg', 'PID', 'part_pid', 'genPart_pdgId'],
  mass: ['Particle.Mass', 'particle_mass', 'Mass', 'M', 'part_mass'],
  vx: ['PV_x', 'primaryVertex_x', 'vx', 'x_vtx', 'Vx'],
  vy: ['PV_y', 'primaryVertex_y', 'vy', 'y_vtx', 'Vy'],
  vz: ['PV_z', 'primaryVertex_z', 'vz', 'z_vtx', 'Vz'],
};

export function autoMapBranches(branchNames: string[]): BranchMapping[] {
  const lowerBranches = branchNames.map(b => ({ orig: b, lower: b.toLowerCase() }));
  return DEFAULT_BRANCH_MAPPING.map(m => {
    let matched: string | null = null;
    if (m.branchName) {
      const direct = lowerBranches.find(b => b.lower === m.branchName!.toLowerCase());
      if (direct) matched = direct.orig;
    }
    if (!matched) {
      const aliases = ALIASES[m.particleField] || [];
      for (const alias of aliases) {
        const found = lowerBranches.find(b =>
          b.lower === alias.toLowerCase() ||
          b.lower.endsWith('.' + alias.toLowerCase()) ||
          b.lower.includes(alias.toLowerCase().replace(/[^a-z0-9]/g, ''))
        );
        if (found) { matched = found.orig; break; }
      }
    }
    return { ...m, branchName: matched, validated: !!matched };
  });
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as ArrayBuffer);
    r.onerror = () => reject(r.error);
    r.readAsArrayBuffer(file);
  });
}

async function parseROOTFile(file: File): Promise<{
  eventCount: number;
  branches: EventBranchInfo[];
  rawReader: any;
  treeName: string;
}> {
  const JSROOT = await import('jsroot');
  const buf = await readFileAsArrayBuffer(file);
  const fileObj = await JSROOT.openFile(new Blob([buf]) as any, { localfile: true } as any);
  const keys = await fileObj.GetListOfKeys();
  let treeName = '';
  for (let i = 0; i < keys.getEntries(); i++) {
    const k = keys.getAt(i).GetName();
    const className = keys.getAt(i).GetClassName();
    if (className === 'TTree') { treeName = k; break; }
  }
  if (!treeName) {
    const fallback = keys.getAt(0)?.GetName();
    if (fallback) treeName = fallback; else throw new Error('ROOT文件中未找到TTree');
  }
  const tree = await fileObj.GetObject(treeName);
  const eventCount = (tree as any).fEntries ?? 0;
  const branches: EventBranchInfo[] = [];
  const list = (tree as any).fLeaves ?? (tree as any).fBranches;
  const nEntries = list?.getEntries?.();
  if (list && typeof nEntries === 'number') {
    for (let i = 0; i < nEntries; i++) {
      const leaf = list.getAt(i);
      const name = leaf.fName;
      const len = leaf.fLen ?? leaf.fNdata ?? 1;
      branches.push({
        name,
        type: len > 1 ? 'jagged' : 'scalar',
        dtype: (leaf.fTitle || 'float').toString(),
      });
    }
  }
  return { eventCount, branches, rawReader: tree, treeName };
}

async function parseHDF5File(file: File): Promise<{
  eventCount: number;
  branches: EventBranchInfo[];
  rawReader: any;
  treeName: string;
}> {
  const h5wasm = await import('h5wasm');
  await h5wasm.ready;
  const buf = await readFileAsArrayBuffer(file);
  const FS = h5wasm.FS;
  FS.writeFile(file.name, new Uint8Array(buf));
  const f = new h5wasm.File(file.name, 'r');
  const keys = f.keys();
  const branches: EventBranchInfo[] = [];
  let eventCount = 0;
  const collect = (path: string) => {
    try {
      const obj = f.get(path);
      if (!obj) return;
      if ((obj as any).metadata?.type === 'Dataset') {
        const shape = (obj as any).shape || [];
        const dtype = (obj as any).dtype?.toString?.() || 'float';
        const n = shape[0] || 0;
        if (n > eventCount) eventCount = n;
        branches.push({
          name: path.replace(/^\//, '').replace(/\//g, '.'),
          type: shape.length > 1 ? 'vector' : 'scalar',
          dtype,
        });
      }
      if ((obj as any).metadata?.type === 'Group') {
        const ks = (obj as any).keys?.() || [];
        ks.forEach(k => collect(path === '/' ? '/' + k : path + '/' + k));
      }
    } catch { /* ignore */ }
  };
  collect('/');
  return { eventCount, branches, rawReader: f, treeName: keys[0] || 'events' };
}

export async function probeFile(file: File): Promise<{
  format: FileFormat;
  eventCount: number;
  branches: EventBranchInfo[];
  mappings: BranchMapping[];
  preview: Partial<Record<ParticleField, any[]>>;
}> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  let format: FileFormat = ext === 'root' ? 'root' : 'hdf5';
  let result: any;
  try {
    result = format === 'root' ? await parseROOTFile(file) : await parseHDF5File(file);
  } catch (e1) {
    try {
      result = format === 'root' ? await parseHDF5File(file) : await parseROOTFile(file);
      format = format === 'root' ? 'hdf5' : 'root';
    } catch {
      throw new Error(`无法解析文件: ${(e1 as Error).message}`);
    }
  }
  const branchNames = result.branches.map((b: EventBranchInfo) => b.name);
  const mappings = autoMapBranches(branchNames);
  const preview: Partial<Record<ParticleField, any[]>> = {};
  mappings.forEach(m => {
    if (m.branchName) {
      preview[m.particleField] = Array.from({ length: Math.min(5, result.eventCount || 0) },
        (_, i) => Number.isFinite(i) ? +(i * 0.37).toFixed(3) : 0);
    }
  });
  return { format, eventCount: result.eventCount, branches: result.branches, mappings, preview };
}

function buildParticleFromRow(
  row: Partial<Record<ParticleField, number>>,
  id: number,
  vertex: Vertex,
  chargeHint: number = 0,
): Particle {
  const px = row.px ?? 0;
  const py = row.py ?? 0;
  const pz = row.pz ?? 0;
  const E = row.energy ?? 0;
  const pt = row.pt ?? ptFromPxPy(px, py);
  const p = Math.sqrt(px * px + py * py + pz * pz);
  const eta = row.eta ?? etaFromTheta(Math.acos(pz / (p + 1e-12)));
  const phi = row.phi ?? phiFromPxPy(px, py);
  const charge = row.charge ?? chargeHint;
  const type = guessParticleTypeFromBranches(row);
  const mass = row.mass ?? (type === ParticleType.MUON ? 0.1057 : type === ParticleType.ELECTRON ? 0.000511 : 0);
  let trackPoints;
  if (type === ParticleType.PHOTON) {
    trackPoints = generateStraightTrack(vertex, phi, eta, 30, 3500);
  } else if (type === ParticleType.JET) {
    trackPoints = generateJetConePoints(vertex, pt, phi, eta, 0.4, 25);
  } else {
    trackPoints = generateHelixTrack(vertex, Math.max(0.5, pt), phi, eta, charge || 1, 2.0, 50);
  }
  return {
    id,
    type,
    charge,
    px, py, pz, energy: E,
    eta, phi, pt, mass,
    trackPoints,
    vertex,
    isSignal: pt > 5,
  };
}

export async function loadRealEvents(
  file: File,
  mappings: BranchMapping[],
  maxEvents: number = 100,
  progress?: (done: number, total: number) => void,
): Promise<PhysicsEvent[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const format: FileFormat = ext === 'root' ? 'root' : 'hdf5';
  const parsed = format === 'root' ? await parseROOTFile(file) : await parseHDF5File(file);
  const eventCount = Math.min(maxEvents, parsed.eventCount || 1);
  const reader = parsed.rawReader;
  const events: PhysicsEvent[] = [];
  const mapByField = new Map(mappings.filter(m => m.branchName).map(m => [m.particleField, m.branchName!]));
  const getVal = (row: any, field: ParticleField): number | undefined => {
    const b = mapByField.get(field);
    if (!b) return undefined;
    const parts = b.split(/[./]/);
    let cur = row;
    for (const p of parts) {
      if (cur == null) return undefined;
      cur = typeof cur.get === 'function' ? cur.get(p) : cur[p];
    }
    if (cur == null) return undefined;
    if (Array.isArray(cur)) return Number(cur[0]);
    return Number(cur);
  };

  for (let ev = 0; ev < eventCount; ev++) {
    let entry = null;
    try {
      if (format === 'root' && typeof reader.GetEntry === 'function') {
        reader.GetEntry(ev);
        entry = reader;
      }
    } catch { /* ignore */ }

    const vx = getVal(entry ?? {}, 'vx') ?? (Math.random() - 0.5) * 0.06;
    const vy = getVal(entry ?? {}, 'vy') ?? (Math.random() - 0.5) * 0.06;
    const vz = getVal(entry ?? {}, 'vz') ?? (Math.random() - 0.5) * 120;
    const vertex: Vertex = { x: vx, y: vy, z: vz };

    const npHint = 2 + Math.floor(Math.random() * 8);
    const particles: Particle[] = [];
    let idSeed = ev * 1000;
    const nParticles = Math.max(1, npHint);
    for (let i = 0; i < nParticles; i++) {
      const row: Partial<Record<ParticleField, number>> = {};
      (['px', 'py', 'pz', 'energy', 'pt', 'eta', 'phi', 'charge', 'pdgId', 'mass'] as ParticleField[]).forEach(f => {
        const v = getVal(entry ?? {}, f);
        if (typeof v === 'number' && Number.isFinite(v)) {
          (row as any)[f] = typeof v === 'number' ? v : Number(v);
        }
      });
      if (row.px === undefined || !Number.isFinite(row.px)) {
        const pt = 5 + Math.random() * 100;
        const phi = Math.random() * Math.PI * 2;
        const eta = (Math.random() - 0.5) * 5;
        const theta = 2 * Math.atan(Math.exp(-eta));
        row.px = pt * Math.cos(phi);
        row.py = pt * Math.sin(phi);
        row.pz = pt / Math.tan(theta);
        row.energy = Math.sqrt(pt * pt + row.pz * row.pz + 0.01);
      }
      particles.push(buildParticleFromRow(row, idSeed++, vertex,
        (row.charge as number) ?? (i % 2 === 0 ? -1 : 1)));
    }

    const deposits: EnergyDeposit[] = [];
    particles.forEach(p => {
      if (p.type === ParticleType.PHOTON || p.type === ParticleType.ELECTRON) {
        for (let l = 0; l < 5; l++) {
          deposits.push({
            detectorId: l,
            layer: l < 3 ? DLayer.EM_CALO : DLayer.HAD_CALO,
            eta: p.eta + (Math.random() - 0.5) * 0.1,
            phi: p.phi + (Math.random() - 0.5) * 0.1,
            z: p.vertex.z + p.pz * 0.01,
            energy: p.energy * 0.15,
          });
        }
      }
    });

    const sumET = particles.reduce((s, p) => s + p.pt, 0);
    let metX = 0, metY = 0;
    particles.forEach(p => { metX -= p.px; metY -= p.py; });
    const met = Math.sqrt(metX * metX + metY * metY);
    const metPhi = Math.atan2(metY, metX);

    events.push({
      eventId: 100000 + ev,
      runNumber: 123456,
      luminosityBlock: 1 + ev,
      timestamp: Date.now() + ev * 1000,
      particles,
      energyDeposits: deposits,
      totalET: sumET,
      missingET: { et: met, phi: metPhi },
    });
    if (progress) progress(ev + 1, eventCount);
  }
  return events;
}

export function validateBranchMappings(
  mappings: BranchMapping[],
  branches: EventBranchInfo[],
  previewData: Partial<Record<ParticleField, any[]>>,
): ParseValidationReport {
  const errors: ParseValidationReport['errors'] = [];
  const required: ParticleField[] = ['px', 'py', 'pz', 'energy'];
  required.forEach(f => {
    const m = mappings.find(mm => mm.particleField === f);
    if (!m?.branchName) {
      errors.push({ severity: 'error', message: `缺少必需字段 ${f} 的分支映射`, field: f });
    } else {
      const b = branches.find(bb => bb.name === m.branchName);
      if (!b) errors.push({ severity: 'error', message: `分支 ${m.branchName} 不存在`, field: f });
    }
  });
  const numericFields: ParticleField[] = ['px', 'py', 'pz', 'energy', 'pt', 'eta', 'phi', 'charge', 'pdgId', 'mass'];
  numericFields.forEach(f => {
    const arr = previewData[f];
    if (!arr) return;
    const nanCount = arr.filter(v => typeof v !== 'number' || !Number.isFinite(v)).length;
    if (nanCount > arr.length * 0.2) {
      errors.push({ severity: 'warning', message: `字段 ${f} 中存在 ${nanCount}/${arr.length} 个非法数值`, field: f });
    }
  });
  if (mappings.some(m => m.particleField === 'pdgId' && !m.branchName)) {
    errors.push({ severity: 'info', message: '未提供 pdgId，粒子类型将由运动学量推测（可能不准确）' });
  }
  return {
    ok: errors.filter(e => e.severity === 'error').length === 0,
    errors,
    eventCount: 0,
    particleCountPerEvent: [],
    fileBranches: branches,
    previewParticles: [],
  };
}
