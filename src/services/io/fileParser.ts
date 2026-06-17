import type {
  Particle, PhysicsEvent, EnergyDeposit, Vertex, DetectorLayer,
  ParticleField, BranchMapping, EventBranchInfo, ParseValidationReport,
  EventMetaField, MetaBranchMapping, FieldSource, ParticleWithSource,
  PhysicsEventWithMeta,
} from '@/types/physics';
import {
  ParticleType, DetectorLayer as DLayer,
  EVENT_META_FIELDS, EVENT_META_ALIASES,
} from '@/types/physics';
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
  if (pdg !== undefined && Number.isFinite(pdg)) return pdgToParticleType(pdg);
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
  px: ['Particle.Px', 'particle_px', 'Px', 'p_x', 'part_px', 'genPart_px', 'ParticlePx', 'particles_px'],
  py: ['Particle.Py', 'particle_py', 'Py', 'p_y', 'part_py', 'genPart_py', 'ParticlePy', 'particles_py'],
  pz: ['Particle.Pz', 'particle_pz', 'Pz', 'p_z', 'part_pz', 'genPart_pz', 'ParticlePz', 'particles_pz'],
  energy: ['Particle.E', 'particle_energy', 'E', 'e', 'part_e', 'genPart_e', 'Energy', 'ParticleEnergy', 'particles_energy'],
  pt: ['Particle.PT', 'particle_pt', 'PT', 'Pt', 'pT', 'part_pt', 'genPart_pt', 'ParticlePt', 'particles_pt'],
  eta: ['Particle.Eta', 'particle_eta', 'Eta', 'part_eta', 'genPart_eta', 'ParticleEta', 'particles_eta'],
  phi: ['Particle.Phi', 'particle_phi', 'Phi', 'part_phi', 'genPart_phi', 'ParticlePhi', 'particles_phi'],
  charge: ['Particle.Charge', 'particle_charge', 'Charge', 'q', 'Q', 'part_charge', 'ParticleCharge'],
  pdgId: ['Particle.PID', 'particle_pdgId', 'PDG', 'PdgId', 'pdg', 'PID', 'part_pid', 'genPart_pdgId', 'ParticlePdgId', 'pdgid'],
  mass: ['Particle.Mass', 'particle_mass', 'Mass', 'M', 'part_mass', 'ParticleMass', 'particles_mass'],
  vx: ['PV_x', 'primaryVertex_x', 'vx', 'x_vtx', 'Vx', 'PrimaryVertex_x', 'vertex_x'],
  vy: ['PV_y', 'primaryVertex_y', 'vy', 'y_vtx', 'Vy', 'PrimaryVertex_y', 'vertex_y'],
  vz: ['PV_z', 'primaryVertex_z', 'vz', 'z_vtx', 'Vz', 'PrimaryVertex_z', 'vertex_z'],
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
        const aLower = alias.toLowerCase().replace(/[^a-z0-9_]/g, '');
        const found = lowerBranches.find(b => {
          const bClean = b.lower.replace(/[^a-z0-9_]/g, '');
          return b.lower === alias.toLowerCase() ||
            b.lower.endsWith('.' + alias.toLowerCase()) ||
            b.lower.endsWith('_' + alias.toLowerCase()) ||
            bClean === aLower ||
            bClean.endsWith('_' + aLower) ||
            bClean.endsWith('.' + aLower);
        });
        if (found) { matched = found.orig; break; }
      }
    }
    return { ...m, branchName: matched, validated: !!matched };
  });
}

export function autoMapMetaBranches(branchNames: string[]): MetaBranchMapping[] {
  const lowerBranches = branchNames.map(b => ({ orig: b, lower: b.toLowerCase() }));
  return EVENT_META_FIELDS.map(metaField => {
    let matched: string | null = null;
    const aliases = EVENT_META_ALIASES[metaField];
    for (const alias of aliases) {
      const aLower = alias.toLowerCase().replace(/[^a-z0-9_]/g, '');
      const found = lowerBranches.find(b => {
        const bClean = b.lower.replace(/[^a-z0-9_]/g, '');
        return b.lower === alias.toLowerCase() ||
          b.lower.endsWith('.' + alias.toLowerCase()) ||
          b.lower.endsWith('_' + alias.toLowerCase()) ||
          bClean === aLower ||
          bClean.endsWith('_' + aLower) ||
          bClean.endsWith('.' + aLower);
      });
      if (found) { matched = found.orig; break; }
    }
    return { metaField, branchName: matched };
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

interface ParsedFileData {
  format: FileFormat;
  eventCount: number;
  branches: EventBranchInfo[];
  data: Record<string, any[]>;
  nParticlesPerEvent: number[];
  metaData: Record<EventMetaField, (number | string | null)[]>;
}

function safeNum(v: any, strict: boolean = true): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') {
    return Number.isFinite(v) ? v : null;
  }
  if (typeof v === 'string') {
    if (strict) return null;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (Array.isArray(v) && v.length > 0) return safeNum(v[0], strict);
  if (typeof v === 'object' && v !== null && 'arr' in v && Array.isArray(v.arr)) return safeNum(v.arr[0], strict);
  if (typeof v === 'object' && v !== null && 'fArray' in v && Array.isArray(v.fArray)) return safeNum(v.fArray[0], strict);
  return null;
}

function safeArray(v: any): any[] | null {
  if (Array.isArray(v)) return v;
  if (typeof v === 'object' && v !== null && 'arr' in v && Array.isArray(v.arr)) return v.arr;
  if (typeof v === 'object' && v !== null && 'fArray' in v && Array.isArray(v.fArray)) return v.fArray;
  return null;
}

async function parseROOTFile(file: File, readData: boolean = true, maxPreview: number = 5): Promise<ParsedFileData> {
  const JSROOT = await import('jsroot');
  const buf = await readFileAsArrayBuffer(file);
  const fileObj = await JSROOT.openFile(new Blob([buf]) as any, { localfile: true } as any);
  const keys = await fileObj.GetListOfKeys();
  let treeName = '';
  for (let i = 0; i < keys.getEntries(); i++) {
    const k = keys.getAt(i);
    const className = k.GetClassName?.() || k.fClassName?.toString?.() || '';
    if (className === 'TTree') { treeName = k.GetName?.() || k.fName?.toString?.(); break; }
  }
  if (!treeName) {
    const fallback = keys.getAt(0);
    if (fallback) treeName = fallback.GetName?.() || fallback.fName?.toString?.();
    else throw new Error('ROOT文件中未找到TTree对象，请确认文件格式');
  }

  const tree = await fileObj.GetObject(treeName);
  const eventCount = Number(tree.fEntries ?? tree.fNentries ?? 0);
  if (!Number.isFinite(eventCount) || eventCount <= 0) {
    throw new Error(`ROOT文件中 TTree(${treeName}) 事件数为 ${eventCount}，无效或空文件`);
  }

  const branches: EventBranchInfo[] = [];
  const list = tree.fLeaves ?? tree.fBranches;
  const branchList: { name: string; leaf: any; isArray: boolean; len: number }[] = [];

  if (list && typeof list.getEntries === 'function') {
    for (let i = 0; i < list.getEntries(); i++) {
      const leaf = list.getAt(i);
      const name = String(leaf.fName || '');
      const len = Number(leaf.fLen ?? leaf.fNdata ?? 1);
      const dtype = String(leaf.fTitle || leaf.fType || 'float');
      const isArray = len > 1;
      branches.push({
        name,
        type: isArray ? (len > 1000 ? 'jagged' : 'vector') : 'scalar',
        dtype,
      });
      branchList.push({ name, leaf, isArray, len });
    }
  }

  if (branchList.length === 0) {
    throw new Error(`ROOT TTree(${treeName}) 中未找到任何分支(leaves)，文件可能已损坏或为空`);
  }

  const branchNames = branches.map(b => b.name);
  const metaMappings = autoMapMetaBranches(branchNames);
  const metaData: Record<EventMetaField, (number | string | null)[]> = {
    runNumber: [],
    luminosityBlock: [],
    eventId: [],
  };

  const data: Record<string, any[]> = {};
  const nParticlesPerEvent: number[] = [];
  const nToRead = readData ? Math.min(maxPreview, eventCount) : 0;

  if (readData) {
    for (let ev = 0; ev < nToRead; ev++) {
      try {
        if (typeof tree.GetEntry === 'function') {
          const nb = tree.GetEntry(ev);
          if (nb <= 0) console.warn(`[ROOT] 事件 ${ev} 读取字节数=${nb}，可能损坏`);
        } else if (typeof tree.getEntry === 'function') {
          tree.getEntry(ev);
        }
      } catch (e) {
        console.warn(`[ROOT] 读取事件 ${ev} 失败: ${(e as Error).message}`);
      }

      let nPartThisEvent = 1;
      for (const bl of branchList) {
        const name = bl.name;
        let val: any = undefined;
        try {
          val = (tree as any)[name];
          if (val === undefined && bl.leaf && typeof bl.leaf.getValue === 'function') {
            val = bl.leaf.getValue();
          }
        } catch { /* ignore */ }

        if (val === undefined) {
          data[name] = data[name] || [];
          data[name][ev] = null;
          continue;
        }

        const arrVal = safeArray(val);
        if (arrVal !== null) {
          if (arrVal.length > nPartThisEvent) nPartThisEvent = arrVal.length;
          data[name] = data[name] || [];
          data[name][ev] = arrVal.map(v => {
            if (typeof v === 'string') return v;
            if (typeof v === 'number') return v;
            return safeNum(v);
          });
        } else {
          if (typeof val === 'string') {
            data[name] = data[name] || [];
            data[name][ev] = val;
          } else if (typeof val === 'number') {
            data[name] = data[name] || [];
            data[name][ev] = val;
          } else {
            const s = safeNum(val);
            data[name] = data[name] || [];
            data[name][ev] = s;
          }
        }
      }

      metaMappings.forEach(mm => {
        if (mm.branchName && data[mm.branchName]) {
          let rawVal = data[mm.branchName][ev];
          if (Array.isArray(rawVal)) rawVal = rawVal[0];
          metaData[mm.metaField][ev] = rawVal;
        } else {
          metaData[mm.metaField][ev] = null;
        }
      });

      nParticlesPerEvent[ev] = nPartThisEvent;
    }
  }

  return {
    format: 'root',
    eventCount,
    branches,
    data,
    nParticlesPerEvent,
    metaData,
  };
}

async function parseHDF5File(file: File, readData: boolean = true, maxPreview: number = 5): Promise<ParsedFileData> {
  const h5wasm = await import('h5wasm');
  await h5wasm.ready;
  const buf = await readFileAsArrayBuffer(file);
  const FS = h5wasm.FS;
  try { FS.unlink(file.name); } catch { /* ignore */ }
  FS.writeFile(file.name, new Uint8Array(buf));
  const f = new h5wasm.File(file.name, 'r');

  const branches: EventBranchInfo[] = [];
  const datasets: { path: string; name: string; shape: number[]; dtype: string; values?: any[] }[] = [];
  let eventCount = 0;

  const collect = (path: string) => {
    try {
      const obj = f.get(path);
      if (!obj) return;
      const md = (obj as any).metadata;
      if (!md) return;
      if (md.type === 'Dataset') {
        const shape = Array.isArray(md.shape) ? md.shape.map(Number) : [];
        const dtype = String(md.dtype?.toString?.() || md.type || 'float');
        const niceName = path.replace(/^\//, '').replace(/\//g, '.');
        const ds = obj as any;
        let values: any[] | undefined;
        if (readData) {
          try {
            const nToRead = Math.min(maxPreview, shape[0] || maxPreview);
            if (shape.length === 1) {
              values = Array.from(ds.slice ? ds.slice([0], [nToRead]) : (ds.value || []));
              values = values.slice(0, nToRead);
            } else if (shape.length >= 2) {
              values = [];
              for (let i = 0; i < nToRead; i++) {
                try { values.push(ds.slice ? ds.slice([i, 0], [1, shape[1] || 1])[0] : (ds.value?.[i] ?? null)); }
                catch { values.push(null); }
              }
            }
            eventCount = Math.max(eventCount, shape[0] || 0);
          } catch { /* ignore */ }
        } else {
          eventCount = Math.max(eventCount, shape[0] || 0);
        }
        branches.push({
          name: niceName,
          type: shape.length > 1 ? 'vector' : 'scalar',
          dtype,
          sampleValues: values?.slice?.(0, 3)?.map?.(v => Array.isArray(v) ? v[0] : v),
        });
        datasets.push({ path, name: niceName, shape, dtype, values });
      }
      if (md.type === 'Group') {
        const ks = (obj as any).keys?.() || [];
        ks.forEach((k: string) => collect(path === '/' ? '/' + k : path + '/' + k));
      }
    } catch { /* ignore */ }
  };
  collect('/');
  f.close();

  if (eventCount === 0) {
    throw new Error('HDF5 文件未找到有效一维数据集（事件维度），请确认文件格式');
  }
  if (branches.length === 0) {
    throw new Error('HDF5 文件未找到任何可读取的 Dataset');
  }

  const branchNames = branches.map(b => b.name);
  const metaMappings = autoMapMetaBranches(branchNames);
  const metaData: Record<EventMetaField, (number | string | null)[]> = {
    runNumber: [],
    luminosityBlock: [],
    eventId: [],
  };

  const data: Record<string, any[]> = {};
  const nParticlesPerEvent: number[] = [];
  const nToRead = Math.min(maxPreview, eventCount);

  for (const ds of datasets) {
    if (!ds.values) continue;
    data[ds.name] = ds.values.map((v: any) => {
      if (Array.isArray(v)) return v.map((x: any) => {
        if (typeof x === 'string') return x;
        if (typeof x === 'number') return x;
        return safeNum(x);
      });
      if (typeof v === 'string') return v;
      if (typeof v === 'number') return v;
      return safeNum(v);
    });
  }

  for (let ev = 0; ev < nToRead; ev++) {
    let nPart = 1;
    for (const ds of datasets) {
      if (!ds.values) continue;
      const v = ds.values[ev];
      if (Array.isArray(v) && v.length > nPart) nPart = v.length;
    }
    nParticlesPerEvent[ev] = nPart;

    metaMappings.forEach(mm => {
      if (mm.branchName && data[mm.branchName]) {
        let rawVal = data[mm.branchName][ev];
        if (Array.isArray(rawVal)) rawVal = rawVal[0];
        metaData[mm.metaField][ev] = rawVal;
      } else {
        metaData[mm.metaField][ev] = null;
      }
    });
  }

  return { format: 'hdf5', eventCount, branches, data, nParticlesPerEvent, metaData };
}

export async function probeFile(file: File): Promise<{
  format: FileFormat;
  eventCount: number;
  branches: EventBranchInfo[];
  mappings: BranchMapping[];
  metaMappings: MetaBranchMapping[];
  preview: Partial<Record<ParticleField, any[]>>;
  metaPreview: Record<EventMetaField, (number | string | null)[]>;
  nParticlesPerEvent: number[];
  rawData: ParsedFileData;
}> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  let format: FileFormat = ext === 'root' ? 'root' : 'hdf5';
  let parsed: ParsedFileData;
  try {
    parsed = format === 'root'
      ? await parseROOTFile(file, true, 5)
      : await parseHDF5File(file, true, 5);
  } catch (e1) {
    try {
      parsed = format === 'root'
        ? await parseHDF5File(file, true, 5)
        : await parseROOTFile(file, true, 5);
      format = format === 'root' ? 'hdf5' : 'root';
    } catch (e2) {
      const msg1 = (e1 as Error).message;
      const msg2 = (e2 as Error).message;
      throw new Error(`文件解析失败（尝试 ROOT 和 HDF5 两种格式均失败）：\n  ROOT: ${msg1}\n  HDF5: ${msg2}`);
    }
  }

  const branchNames = parsed.branches.map(b => b.name);
  const mappings = autoMapBranches(branchNames);
  const metaMappings = autoMapMetaBranches(branchNames);
  const preview: Partial<Record<ParticleField, any[]>> = {};
  const metaPreview: Record<EventMetaField, (number | string | null)[]> = {
    runNumber: [...parsed.metaData.runNumber],
    luminosityBlock: [...parsed.metaData.luminosityBlock],
    eventId: [...parsed.metaData.eventId],
  };
  const nRead = parsed.nParticlesPerEvent.length;

  mappings.forEach(m => {
    if (!m.branchName) return;
    const col = parsed.data[m.branchName];
    if (!col) return;
    const arr: any[] = [];
    for (let ev = 0; ev < nRead; ev++) {
      const v = col[ev];
      if (Array.isArray(v)) arr.push([...v]);
      else arr.push(v);
    }
    preview[m.particleField] = arr;
    m.sampleValues = arr.slice(0, 5).map(v => Array.isArray(v) ? v[0] : v).filter(v => v !== null && v !== undefined);
    const firstNonNull = arr.find(v => v !== null && v !== undefined);
    if (firstNonNull !== undefined) {
      m.dtype = typeof firstNonNull === 'number' ? 'float' : typeof firstNonNull;
    }
  });

  metaMappings.forEach(mm => {
    if (!mm.branchName) return;
    const col = parsed.data[mm.branchName];
    if (!col) return;
    mm.sampleValues = col.slice(0, 5).map(v => Array.isArray(v) ? v[0] : v).filter(v => v !== null && v !== undefined);
    const firstNonNull = col.find(v => {
      const val = Array.isArray(v) ? v[0] : v;
      return val !== null && val !== undefined;
    });
    if (firstNonNull !== undefined) {
      mm.dtype = typeof firstNonNull === 'number' ? 'float' : typeof firstNonNull;
    }
  });

  return {
    format,
    eventCount: parsed.eventCount,
    branches: parsed.branches,
    mappings,
    metaMappings,
    preview,
    metaPreview,
    nParticlesPerEvent: parsed.nParticlesPerEvent,
    rawData: parsed,
  };
}

function validateNumber(
  v: any,
  field: ParticleField,
  idx: number,
  errors: ParseValidationReport['errors'],
  allowArray: boolean = false,
  isRequiredFourMomentum: boolean = false,
): number | number[] | null {
  if (v === null || v === undefined) {
    errors.push({ severity: 'error', message: `字段 ${field} 第 ${idx} 个值为 null/undefined`, field });
    return null;
  }
  if (Array.isArray(v)) {
    if (!allowArray) {
      errors.push({ severity: 'warning', message: `字段 ${field} 第 ${idx} 个为数组（标量分支？），取首元素`, field });
      return validateNumber(v[0], field, idx, errors, false, isRequiredFourMomentum) as number;
    }
    return v.map((x, i) => validateNumber(x, field, idx * 1000 + i, errors, false, isRequiredFourMomentum) as number).filter(x => x !== null) as number[];
  }
  if (typeof v === 'string') {
    errors.push({
      severity: isRequiredFourMomentum ? 'error' : 'error',
      message: `字段 ${field} 第 ${idx} 个值为字符串类型 "${v.slice(0, 40)}"，文件分支必须是数值数组（float/int/double），哪怕字符串内容像数字也不会被自动解析`,
      field,
    });
    return null;
  }
  if (typeof v !== 'number') {
    errors.push({ severity: 'error', message: `字段 ${field} 第 ${idx} 个值类型为 ${typeof v}，需要数值`, field });
    return null;
  }
  if (!Number.isFinite(v)) {
    errors.push({ severity: 'error', message: `字段 ${field} 第 ${idx} 个值为 ${v}（非有限数）`, field });
    return null;
  }
  if (field === 'energy' && v <= 0) {
    errors.push({ severity: 'error', message: `字段 ${field} 第 ${idx} 个值为 ${v}，能量必须 > 0`, field });
  }
  if (field === 'pt' && v < 0) {
    errors.push({ severity: 'warning', message: `字段 ${field} 第 ${idx} 个值为 ${v}，pT 不应为负`, field });
  }
  if ((field === 'eta' || field === 'phi') && (Math.abs(v) > 100)) {
    errors.push({ severity: 'warning', message: `字段 ${field} 第 ${idx} 个值为 ${v}，范围异常（eta 通常 |η|<5, phi [0,2π)）`, field });
  }
  return v;
}

export function validateBranchMappings(
  mappings: BranchMapping[],
  branches: EventBranchInfo[],
  previewData: Partial<Record<ParticleField, any[]>>,
  nParticlesPerEvent: number[] = [],
): ParseValidationReport {
  const errors: ParseValidationReport['errors'] = [];
  const required: ParticleField[] = ['px', 'py', 'pz', 'energy'];

  required.forEach(f => {
    const m = mappings.find(mm => mm.particleField === f);
    if (!m?.branchName) {
      errors.push({
        severity: 'error',
        message: `必需字段 ${f} 未映射，请在下拉列表中选择对应的文件分支`,
        field: f,
      });
      return;
    }
    const b = branches.find(bb => bb.name === m.branchName);
    if (!b) {
      errors.push({ severity: 'error', message: `分支 "${m.branchName}" 不存在于文件中`, field: f });
    }
  });

  const numericFields: ParticleField[] =
    ['px', 'py', 'pz', 'energy', 'pt', 'eta', 'phi', 'charge', 'pdgId', 'mass', 'vx', 'vy', 'vz'];

  let maxParticles = 0;
  let minParticles = Infinity;
  nParticlesPerEvent.forEach(n => {
    if (n > maxParticles) maxParticles = n;
    if (n < minParticles) minParticles = n;
  });

  if (maxParticles === 0) {
    errors.push({ severity: 'error', message: '前 5 个事件的粒子数均为 0，空数组，无法生成有效径迹' });
  }

  mappings.forEach(m => {
    if (!m.branchName) return;
    const values = previewData[m.particleField];
    if (!values || values.length === 0) {
      if (m.required) {
        errors.push({ severity: 'error', message: `字段 ${m.particleField} 无预览数据，无法读取`, field: m.particleField });
      } else {
        errors.push({ severity: 'info', message: `字段 ${m.particleField} 无预览数据，将在导入时自动推导`, field: m.particleField });
      }
      return;
    }

    values.forEach((v, idx) => {
      if (v === null || v === undefined) {
        if (m.required) {
          errors.push({ severity: 'error', message: `字段 ${m.particleField} 事件 ${idx} 值为 null/undefined`, field: m.particleField });
        }
        return;
      }
      if (Array.isArray(v) && v.length === 0) {
        if (m.required) {
          errors.push({ severity: 'error', message: `字段 ${m.particleField} 事件 ${idx} 为空数组，无法读取粒子数据`, field: m.particleField });
        }
        return;
      }
      if (maxParticles > 1 && !Array.isArray(v)) {
        errors.push({
          severity: 'warning',
          message: `字段 ${m.particleField} 事件 ${idx} 是标量值，但同事件其他字段有 ${maxParticles} 个粒子，可能是事件级标量（如 MET）而非粒子级分支`,
          field: m.particleField,
        });
      }
      validateNumber(v, m.particleField, idx, errors, maxParticles > 1, m.required);
    });

    const nonNull = values.flatMap(v => Array.isArray(v) ? v : [v]).filter(v => v !== null && v !== undefined);
    if (nonNull.length === 0 && m.required) {
      errors.push({ severity: 'error', message: `字段 ${m.particleField} 前 5 个事件全部为空，无法解析`, field: m.particleField });
    }
  });

  if (!mappings.some(m => m.particleField === 'pdgId' && m.branchName)) {
    errors.push({
      severity: 'info',
      message: '未提供 pdgId 分支，粒子类型将由 pT/eta/charge 启发式推测（准确性有限，建议提供 PDG 编码）',
    });
  }

  const allErr = errors.filter(e => e.severity === 'error').length;
  const allWarn = errors.filter(e => e.severity === 'warning').length;

  const previewParticles: Particle[] = [];
  if (allErr === 0 && nParticlesPerEvent.length > 0) {
    let id = 0;
    for (let ev = 0; ev < Math.min(1, nParticlesPerEvent.length); ev++) {
      const nP = nParticlesPerEvent[ev];
      for (let i = 0; i < Math.min(3, nP); i++) {
        const row: Partial<Record<ParticleField, number>> = {};
        numericFields.forEach(f => {
          const m = mappings.find(mm => mm.particleField === f);
          if (!m?.branchName) return;
          const arr = previewData[f];
          if (!arr) return;
          const evV = arr[ev];
          if (Array.isArray(evV)) { row[f] = safeNum(evV[i]) ?? undefined; }
          else if (nP === 1) { row[f] = safeNum(evV) ?? undefined; }
        });
        if (row.px !== undefined && row.py !== undefined && row.pz !== undefined && row.energy !== undefined) {
          previewParticles.push({
            id: id++,
            type: guessParticleTypeFromBranches(row),
            charge: row.charge ?? 0,
            px: row.px, py: row.py, pz: row.pz, energy: row.energy,
            eta: row.eta ?? 0, phi: row.phi ?? 0, pt: row.pt ?? 0, mass: row.mass ?? 0,
            trackPoints: [], vertex: { x: 0, y: 0, z: 0 }, isSignal: false,
          });
        }
      }
    }
  }

  return {
    ok: allErr === 0,
    errors,
    eventCount: nParticlesPerEvent.length,
    particleCountPerEvent: nParticlesPerEvent,
    fileBranches: branches,
    previewParticles,
  };
}

function getMappedValue(
  col: any[] | undefined,
  eventIdx: number,
  particleIdx: number,
  nParticles: number,
  field: ParticleField,
  required: boolean,
): number {
  if (!col || eventIdx >= col.length) {
    if (required) {
      throw new Error(`[事件 ${eventIdx}] 字段 ${field} 无数据（数组越界）`);
    }
    return NaN;
  }
  const v = col[eventIdx];
  if (v === null || v === undefined) {
    if (required) {
      throw new Error(`[事件 ${eventIdx}] 字段 ${field} 为 null/undefined`);
    }
    return NaN;
  }
  if (typeof v === 'string') {
    if (required) {
      throw new Error(`[事件 ${eventIdx}] 字段 ${field} 是字符串类型 "${v.slice(0, 30)}"，必须是数值（float/int/double），哪怕字符串看起来像数字也不允许`);
    }
    return NaN;
  }
  if (Array.isArray(v)) {
    if (particleIdx >= v.length) {
      if (required) {
        throw new Error(`[事件 ${eventIdx}] 字段 ${field} 数组长度=${v.length}，但当前事件粒子数=${nParticles}，越界访问粒子 ${particleIdx}`);
      }
      return NaN;
    }
    if (typeof v[particleIdx] === 'string') {
      if (required) {
        throw new Error(`[事件 ${eventIdx}] 字段 ${field}[${particleIdx}] 是字符串类型 "${String(v[particleIdx]).slice(0, 30)}"，必须是数值（float/int/double）`);
      }
      return NaN;
    }
    const n = safeNum(v[particleIdx]);
    if (n === null || !Number.isFinite(n)) {
      if (required) {
        throw new Error(`[事件 ${eventIdx}] 字段 ${field}[${particleIdx}] = ${v[particleIdx]} 无效数值`);
      }
      return NaN;
    }
    return n;
  }
  if (nParticles === 1) {
    const n = safeNum(v);
    if (n === null || !Number.isFinite(n)) {
      if (required) {
        throw new Error(`[事件 ${eventIdx}] 字段 ${field} = ${v} 无效数值`);
      }
      return NaN;
    }
    return n;
  }
  if (required) {
    throw new Error(`[事件 ${eventIdx}] 字段 ${field} 是标量（值=${v}），但事件有 ${nParticles} 个粒子，请检查分支映射是否指向粒子级数组`);
  }
  return NaN;
}

function buildParticleStrict(
  row: Required<Pick<Record<ParticleField, number>, 'px' | 'py' | 'pz' | 'energy'>>
    & Partial<Record<ParticleField, number>>,
  id: number,
  vertex: Vertex,
  fieldSources: Partial<Record<ParticleField, FieldSource>>,
  rawBranchNames: Partial<Record<ParticleField, string>>,
): ParticleWithSource {
  const { px, py, pz, energy: E } = row;
  if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pz) || !Number.isFinite(E)) {
    throw new Error(`粒子 ${id} 四动量不完整 (px=${px}, py=${py}, pz=${pz}, E=${E})`);
  }
  if (E <= 0) {
    throw new Error(`粒子 ${id} 能量 E=${E} <= 0，非物理`);
  }
  const pt = Number.isFinite(row.pt) ? row.pt! : ptFromPxPy(px, py);
  const p = Math.sqrt(px * px + py * py + pz * pz);
  const eta = Number.isFinite(row.eta) ? row.eta! : etaFromTheta(Math.acos(pz / (p + 1e-12)));
  const phi = Number.isFinite(row.phi) ? row.phi! : phiFromPxPy(px, py);
  const charge = Number.isFinite(row.charge) ? row.charge! : 0;
  const type = guessParticleTypeFromBranches(row);
  const mass = Number.isFinite(row.mass) ? row.mass!
    : type === ParticleType.MUON ? 0.1057
    : type === ParticleType.ELECTRON ? 0.000511
    : type === ParticleType.TAU ? 1.777
    : type === ParticleType.BQUARK ? 4.7
    : 0;

  const sources: Partial<Record<ParticleField, FieldSource>> = {
    px: fieldSources.px || 'file',
    py: fieldSources.py || 'file',
    pz: fieldSources.pz || 'file',
    energy: fieldSources.energy || 'file',
    pt: Number.isFinite(row.pt) ? (fieldSources.pt || 'file') : 'derived',
    eta: Number.isFinite(row.eta) ? (fieldSources.eta || 'file') : 'derived',
    phi: Number.isFinite(row.phi) ? (fieldSources.phi || 'file') : 'derived',
    charge: Number.isFinite(row.charge) ? (fieldSources.charge || 'file') : 'derived',
    pdgId: Number.isFinite(row.pdgId) ? (fieldSources.pdgId || 'file') : 'derived',
    mass: Number.isFinite(row.mass) ? (fieldSources.mass || 'file') : 'derived',
  };

  let trackPoints;
  if (type === ParticleType.PHOTON) {
    trackPoints = generateStraightTrack(vertex, phi, eta, 30, 3500);
  } else if (type === ParticleType.JET) {
    trackPoints = generateJetConePoints(vertex, Math.max(1, pt), phi, eta, 0.4, 25);
  } else {
    trackPoints = generateHelixTrack(vertex, Math.max(0.5, pt), phi, eta, charge || 1, 2.0, 50);
  }
  return {
    id, type, charge, px, py, pz, energy: E,
    eta, phi, pt, mass, trackPoints, vertex,
    isSignal: pt > 5,
    fieldSources: sources,
    rawBranchNames,
  };
}

export async function loadRealEvents(
  file: File,
  mappings: BranchMapping[],
  metaMappings?: MetaBranchMapping[],
  maxEvents: number = Number.MAX_SAFE_INTEGER,
  progress?: (done: number, total: number) => void,
): Promise<PhysicsEventWithMeta[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  let format: FileFormat = ext === 'root' ? 'root' : 'hdf5';
  let parsed: ParsedFileData;

  try {
    parsed = format === 'root'
      ? await parseROOTFile(file, true, maxEvents)
      : await parseHDF5File(file, true, maxEvents);
  } catch (e1) {
    try {
      parsed = format === 'root'
        ? await parseHDF5File(file, true, maxEvents)
        : await parseROOTFile(file, true, maxEvents);
      format = format === 'root' ? 'hdf5' : 'root';
    } catch (e2) {
      const msg1 = (e1 as Error).message;
      const msg2 = (e2 as Error).message;
      throw new Error(`文件解析失败（尝试 ROOT 和 HDF5 两种格式均失败）：\n  ROOT: ${msg1}\n  HDF5: ${msg2}`);
    }
  }

  const eventCount = Math.min(maxEvents, parsed.eventCount);
  if (eventCount <= 0) {
    throw new Error(`文件事件数=${parsed.eventCount}，无可解析事件`);
  }

  const mapByField = new Map(mappings.filter(m => m.branchName).map(m => [m.particleField, m.branchName!]));
  const requiredFields: ParticleField[] = ['px', 'py', 'pz', 'energy'];
  for (const f of requiredFields) {
    if (!mapByField.has(f)) {
      throw new Error(`必需字段 ${f} 缺失映射，无法导入，请回到映射步骤配置`);
    }
    const b = mapByField.get(f)!;
    if (!parsed.data[b]) {
      throw new Error(`必需字段 ${f} 映射到分支 "${b}"，但该分支无数据`);
    }
  }

  const metaMap = new Map<EventMetaField, string>();
  if (metaMappings) {
    metaMappings.forEach(mm => {
      if (mm.branchName) metaMap.set(mm.metaField, mm.branchName);
    });
  }

  const events: PhysicsEventWithMeta[] = [];
  const pxCol = parsed.data[mapByField.get('px')!];
  const pyCol = parsed.data[mapByField.get('py')!];
  const pzCol = parsed.data[mapByField.get('pz')!];
  const eCol = parsed.data[mapByField.get('energy')!];
  const ptCol = mapByField.get('pt') ? parsed.data[mapByField.get('pt')!] : undefined;
  const etaCol = mapByField.get('eta') ? parsed.data[mapByField.get('eta')!] : undefined;
  const phiCol = mapByField.get('phi') ? parsed.data[mapByField.get('phi')!] : undefined;
  const qCol = mapByField.get('charge') ? parsed.data[mapByField.get('charge')!] : undefined;
  const pdgCol = mapByField.get('pdgId') ? parsed.data[mapByField.get('pdgId')!] : undefined;
  const mCol = mapByField.get('mass') ? parsed.data[mapByField.get('mass')!] : undefined;
  const vxCol = mapByField.get('vx') ? parsed.data[mapByField.get('vx')!] : undefined;
  const vyCol = mapByField.get('vy') ? parsed.data[mapByField.get('vy')!] : undefined;
  const vzCol = mapByField.get('vz') ? parsed.data[mapByField.get('vz')!] : undefined;

  const runCol = metaMap.get('runNumber') ? parsed.data[metaMap.get('runNumber')!] : undefined;
  const lumiCol = metaMap.get('luminosityBlock') ? parsed.data[metaMap.get('luminosityBlock')!] : undefined;
  const evtIdCol = metaMap.get('eventId') ? parsed.data[metaMap.get('eventId')!] : undefined;

  const rawBranchNames: Partial<Record<ParticleField, string>> = {};
  for (const m of mappings) {
    if (m.branchName) rawBranchNames[m.particleField] = m.branchName;
  }

  for (let ev = 0; ev < eventCount; ev++) {
    let nParticles = 1;
    [pxCol, pyCol, pzCol, eCol].forEach(c => {
      if (c && Array.isArray(c[ev]) && c[ev].length > nParticles) nParticles = c[ev].length;
    });

    if (nParticles === 0) {
      throw new Error(`[事件 ${ev}] 粒子数为 0，四动量分支均为空数组，无法导入`);
    }

    if (nParticles > 5000) {
      throw new Error(`[事件 ${ev}] 粒子数=${nParticles} 过大（>5000），可能是维度映射错误（如把事件级数组当作了粒子级）`);
    }

    const vx = getMappedValue(vxCol, ev, 0, nParticles, 'vx', false);
    const vy = getMappedValue(vyCol, ev, 0, nParticles, 'vy', false);
    const vz = getMappedValue(vzCol, ev, 0, nParticles, 'vz', false);
    const vertex: Vertex = {
      x: Number.isFinite(vx) ? vx : 0,
      y: Number.isFinite(vy) ? vy : 0,
      z: Number.isFinite(vz) ? vz : 0,
    };

    const rawRun = runCol ? runCol[ev] : null;
    const rawLumi = lumiCol ? lumiCol[ev] : null;
    const rawEvtId = evtIdCol ? evtIdCol[ev] : null;
    const runNumVal = Array.isArray(rawRun) ? rawRun[0] : rawRun;
    const lumiVal = Array.isArray(rawLumi) ? rawLumi[0] : rawLumi;
    const evtVal = Array.isArray(rawEvtId) ? rawEvtId[0] : rawEvtId;
    const runNumber = typeof runNumVal === 'number' ? runNumVal : safeNum(runNumVal, false);
    const luminosityBlock = typeof lumiVal === 'number' ? lumiVal : safeNum(lumiVal, false);
    const eventId = typeof evtVal === 'number' ? evtVal : safeNum(evtVal, false);

    const particles: ParticleWithSource[] = [];
    let idSeed = ev * 10000;

    for (let i = 0; i < nParticles; i++) {
      try {
        const px = getMappedValue(pxCol, ev, i, nParticles, 'px', true);
        const py = getMappedValue(pyCol, ev, i, nParticles, 'py', true);
        const pz = getMappedValue(pzCol, ev, i, nParticles, 'pz', true);
        const energy = getMappedValue(eCol, ev, i, nParticles, 'energy', true);
        const row: any = { px, py, pz, energy };
        const sources: Partial<Record<ParticleField, FieldSource>> = {
          px: 'file', py: 'file', pz: 'file', energy: 'file',
        };
        if (ptCol) {
          const v = getMappedValue(ptCol, ev, i, nParticles, 'pt', false);
          if (Number.isFinite(v)) { row.pt = v; sources.pt = 'file'; }
        }
        if (etaCol) {
          const v = getMappedValue(etaCol, ev, i, nParticles, 'eta', false);
          if (Number.isFinite(v)) { row.eta = v; sources.eta = 'file'; }
        }
        if (phiCol) {
          const v = getMappedValue(phiCol, ev, i, nParticles, 'phi', false);
          if (Number.isFinite(v)) { row.phi = v; sources.phi = 'file'; }
        }
        if (qCol) {
          const v = getMappedValue(qCol, ev, i, nParticles, 'charge', false);
          if (Number.isFinite(v)) { row.charge = v; sources.charge = 'file'; }
        }
        if (pdgCol) {
          const v = getMappedValue(pdgCol, ev, i, nParticles, 'pdgId', false);
          if (Number.isFinite(v)) { row.pdgId = v; sources.pdgId = 'file'; }
        }
        if (mCol) {
          const v = getMappedValue(mCol, ev, i, nParticles, 'mass', false);
          if (Number.isFinite(v)) { row.mass = v; sources.mass = 'file'; }
        }

        const p = buildParticleStrict(row, idSeed++, vertex, sources, rawBranchNames);
        particles.push(p);
      } catch (e) {
        const msg = (e as Error).message;
        if (msg.includes('非物理') || msg.includes('越界') || msg.includes('无效数值')) {
          throw new Error(`导入失败：${msg}\n请检查字段映射是否正确，或在"字段映射"步骤中修正分支选择`);
        }
        throw e;
      }
    }

    if (particles.length === 0) {
      throw new Error(`[事件 ${ev}] 无有效粒子，请检查数据格式`);
    }

    const deposits: EnergyDeposit[] = [];
    particles.forEach(p => {
      if (p.type === ParticleType.PHOTON || p.type === ParticleType.ELECTRON) {
        for (let l = 0; l < 3; l++) {
          deposits.push({
            detectorId: l,
            layer: DLayer.EM_CALO,
            eta: p.eta,
            phi: p.phi,
            z: p.vertex.z,
            energy: p.energy * 0.3,
          });
        }
      } else if (p.type === ParticleType.JET) {
        for (let l = 0; l < 4; l++) {
          deposits.push({
            detectorId: 3 + l,
            layer: DLayer.HAD_CALO,
            eta: p.eta,
            phi: p.phi,
            z: p.vertex.z,
            energy: p.energy * 0.2,
          });
        }
      }
    });

    let metX = 0, metY = 0;
    particles.forEach(p => { metX -= p.px; metY -= p.py; });
    const met = Math.sqrt(metX * metX + metY * metY);
    const metPhi = Math.atan2(metY, metX);

    events.push({
      eventId: Number.isFinite(eventId) ? eventId! : 100000 + ev,
      runNumber: Number.isFinite(runNumber) ? runNumber! : 1,
      luminosityBlock: Number.isFinite(luminosityBlock) ? luminosityBlock! : 1 + ev,
      rawEventId: Number.isFinite(eventId) ? eventId! : undefined,
      rawRunNumber: Number.isFinite(runNumber) ? runNumber! : undefined,
      rawLuminosityBlock: Number.isFinite(luminosityBlock) ? luminosityBlock! : undefined,
      eventIdSource: Number.isFinite(eventId) ? 'file' : 'derived',
      runNumberSource: Number.isFinite(runNumber) ? 'file' : 'derived',
      luminosityBlockSource: Number.isFinite(luminosityBlock) ? 'file' : 'derived',
      timestamp: Date.now() + ev * 1000,
      particles,
      energyDeposits: deposits,
      totalET: particles.reduce((s, p) => s + p.pt, 0),
      missingET: { et: met, phi: metPhi },
    });

    if (progress) progress(ev + 1, eventCount);
  }

  if (events.length === 0) {
    throw new Error('解析完成但未生成任何有效事件，请检查数据格式和字段映射');
  }

  return events;
}
