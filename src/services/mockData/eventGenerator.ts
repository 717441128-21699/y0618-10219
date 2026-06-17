import type { Particle, PhysicsEvent, EnergyDeposit } from '@/types/physics';
import { ParticleType, DetectorLayer } from '@/types/physics';
import {
  generateHelixTrack,
  generateStraightTrack,
  ptFromPxPy,
  phiFromPxPy,
  etaFromTheta,
  calcMissingET,
  scalarSumET,
} from '@/services/physics/kinematics';
import { PARTICLE_MASSES } from '@/utils/colors';

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randn(mean: number = 0, sigma: number = 1): number {
  const u1 = Math.random() || 1e-10;
  const u2 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + sigma * z;
}

function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface ParticleSpec {
  type: ParticleType;
  etaRange: [number, number];
  ptRange: [number, number];
  probability: number;
  isSignal?: boolean;
}

const PARTICLE_SPECS: ParticleSpec[] = [
  { type: ParticleType.ELECTRON, etaRange: [-2.5, 2.5], ptRange: [5, 200], probability: 0.12, isSignal: true },
  { type: ParticleType.MUON, etaRange: [-2.7, 2.7], ptRange: [5, 250], probability: 0.10, isSignal: true },
  { type: ParticleType.PHOTON, etaRange: [-2.4, 2.4], ptRange: [10, 300], probability: 0.08, isSignal: true },
  { type: ParticleType.JET, etaRange: [-4.5, 4.5], ptRange: [20, 800], probability: 0.50, isSignal: false },
  { type: ParticleType.TAU, etaRange: [-2.5, 2.5], ptRange: [15, 180], probability: 0.05, isSignal: true },
  { type: ParticleType.BQUARK, etaRange: [-2.5, 2.5], ptRange: [25, 400], probability: 0.15, isSignal: true },
];

interface SignatureEvent {
  type: 'higgs_zz' | 'higgs_gg' | 'z_mumu' | 'z_ee' | 'dijet' | 'w_enum' | 'ttbar' | 'qcd';
  probability: number;
  build: () => Particle[];
}

function sampleParticle(spec: ParticleSpec, id: number, vx: number, vy: number, vz: number): Particle {
  const eta = rand(spec.etaRange[0], spec.etaRange[1]);
  const theta = 2 * Math.atan(Math.exp(-eta));
  let phi = rand(0, 2 * Math.PI);
  const pt = Math.exp(rand(Math.log(spec.ptRange[0]), Math.log(spec.ptRange[1])));
  const px = pt * Math.cos(phi);
  const py = pt * Math.sin(phi);
  const p = pt / Math.sin(theta);
  const pz = p * Math.cos(theta);
  const mass = PARTICLE_MASSES[spec.type] || 0;
  const energy = Math.sqrt(p * p + mass * mass);
  const charge = spec.type === ParticleType.PHOTON || spec.type === ParticleType.JET
    ? 0
    : (Math.random() > 0.5 ? 1 : -1);
  const trackPoints = spec.type === ParticleType.PHOTON
    ? generateStraightTrack({ x: vx, y: vy, z: vz }, phi, eta, 15, 3200)
    : (spec.type === ParticleType.JET
      ? generateJetConePoints(eta, phi, pt, vx, vy, vz)
      : generateHelixTrack({ x: vx, y: vy, z: vz }, pt, phi, eta, charge, 2.0, 45));
  return {
    id,
    type: spec.type,
    charge,
    px, py, pz, energy,
    eta, phi,
    pt, mass,
    trackPoints,
    vertex: { x: vx, y: vy, z: vz },
    isSignal: !!spec.isSignal,
  };
}

function generateJetConePoints(eta: number, phi: number, pt: number, vx: number, vy: number, vz: number): { x: number; y: number; z: number }[] {
  const points: { x: number; y: number; z: number }[] = [{ x: vx, y: vy, z: vz }];
  const coneAngle = Math.max(0.05, 0.4 - pt / 2000);
  const numSub = 8;
  const numSteps = 25;
  for (let s = 0; s < numSteps; s++) {
    const t = (s + 1) / numSteps;
    const radius = 50 + t * 1100;
    const theta = 2 * Math.atan(Math.exp(-eta));
    for (let k = 0; k < numSub; k++) {
      const dphi = rand(-coneAngle, coneAngle);
      const dtheta = rand(-coneAngle, coneAngle);
      const th = theta + dtheta;
      const ph = phi + dphi;
      const x = vx + radius * Math.sin(th) * Math.cos(ph);
      const y = vy + radius * Math.sin(th) * Math.sin(ph);
      const z = vz + radius * Math.cos(th);
      points.push({ x, y, z });
    }
  }
  return points;
}

function buildHiggsZZ(idStart: number): Particle[] {
  const particles: Particle[] = [];
  const vz = randn(0, 50);
  const vx = randn(0, 0.02);
  const vy = randn(0, 0.02);
  let id = idStart;
  const mZ = 91.1876;
  for (let i = 0; i < 2; i++) {
    const boostPhi = rand(0, 2 * Math.PI);
    const boostPt = Math.exp(rand(Math.log(30), Math.log(150)));
    const decayMode = i === 0 ? 'mumu' : (Math.random() > 0.5 ? 'mumu' : 'ee');
    const theta1 = 2 * Math.atan(Math.exp(-rand(-2, 2)));
    const phi1 = rand(0, 2 * Math.PI);
    const p1 = mZ / 2;
    const e1 = p1, px1 = p1 * Math.sin(theta1) * Math.cos(phi1);
    const py1 = p1 * Math.sin(theta1) * Math.sin(phi1);
    const pz1 = p1 * Math.cos(theta1);
    const eta1 = etaFromTheta(theta1);
    const type1 = decayMode === 'mumu' ? ParticleType.MUON : ParticleType.ELECTRON;
    const type2 = type1;
    const pt1 = ptFromPxPy(px1, py1);
    const pts1 = Math.sqrt((boostPt + px1) ** 2 + py1 ** 2);
    if (pts1 > 5) {
      const points1 = (type1 as any) === ParticleType.PHOTON
        ? generateStraightTrack({ x: vx, y: vy, z: vz }, phi1, eta1, 20, 3200)
        : generateHelixTrack({ x: vx, y: vy, z: vz }, pt1, phiFromPxPy(boostPt + px1, py1), eta1, 1, 2.0, 50);
      particles.push({
        id: id++,
        type: type1, charge: -1, px: boostPt + px1, py: py1, pz: pz1,
        energy: Math.sqrt(e1 * e1 + boostPt * boostPt + 2 * boostPt * px1),
        eta: eta1, phi: phiFromPxPy(boostPt + px1, py1),
        pt: pt1, mass: PARTICLE_MASSES[type1],
        trackPoints: points1,
        vertex: { x: vx, y: vy, z: vz }, isSignal: true,
      });
      const phi2 = phi1 + Math.PI;
      const eta2 = etaFromTheta(Math.PI - theta1);
      const pt2 = pt1;
      const points2 = generateHelixTrack({ x: vx, y: vy, z: vz }, pt2, phiFromPxPy(boostPt - px1, -py1), eta2, 1, 2.0, 50);
      particles.push({
        id: id++,
        type: type2, charge: 1, px: boostPt - px1, py: -py1, pz: -pz1,
        energy: Math.sqrt(e1 * e1 + boostPt * boostPt - 2 * boostPt * px1),
        eta: eta2, phi: phiFromPxPy(boostPt - px1, -py1),
        pt: pt2, mass: PARTICLE_MASSES[type2],
        trackPoints: points2,
        vertex: { x: vx, y: vy, z: vz }, isSignal: true,
      });
    }
    void boostPhi;
  }
  const nBgJets = Math.floor(rand(0, 4));
  for (let i = 0; i < nBgJets; i++) {
    particles.push(sampleParticle(PARTICLE_SPECS[3], id++, vx, vy, vz));
  }
  return particles;
}

function buildZToLL(idStart: number, mode: 'ee' | 'mumu'): Particle[] {
  const particles: Particle[] = [];
  const vz = randn(0, 40);
  const vx = randn(0, 0.015);
  const vy = randn(0, 0.015);
  let id = idStart;
  const mZ = 91.1876;
  const p = mZ / 2;
  const boostPt = Math.exp(rand(Math.log(20), Math.log(120)));
  const theta1 = 2 * Math.atan(Math.exp(-rand(-2.2, 2.2)));
  const phi1 = rand(0, 2 * Math.PI);
  const eta1 = etaFromTheta(theta1);
  const type = mode === 'ee' ? ParticleType.ELECTRON : ParticleType.MUON;
  const mass = PARTICLE_MASSES[type];
  const pt1 = p * Math.sin(theta1);
  const px1 = pt1 * Math.cos(phi1);
  const py1 = pt1 * Math.sin(phi1);
  const pz1 = p * Math.cos(theta1);
  const e = Math.sqrt(p * p + mass * mass);
  const pts1 = Math.sqrt((boostPt + px1) ** 2 + py1 ** 2);
  const pts2 = Math.sqrt((boostPt - px1) ** 2 + py1 ** 2);
  if (pts1 > 4 && pts2 > 4) {
    const points1 = generateHelixTrack({ x: vx, y: vy, z: vz }, pt1, phiFromPxPy(boostPt + px1, py1), eta1, -1, 2.0, 60);
    particles.push({
      id: id++, type, charge: -1,
      px: boostPt + px1, py: py1, pz: pz1,
      energy: Math.sqrt(e * e + boostPt * boostPt + 2 * boostPt * px1),
      eta: eta1, phi: phiFromPxPy(boostPt + px1, py1),
      pt: pt1, mass, trackPoints: points1,
      vertex: { x: vx, y: vy, z: vz }, isSignal: true,
    });
    const eta2 = etaFromTheta(Math.PI - theta1);
    const phi2 = phi1 + Math.PI;
    const points2 = generateHelixTrack({ x: vx, y: vy, z: vz }, pt1, phiFromPxPy(boostPt - px1, -py1), eta2, 1, 2.0, 60);
    particles.push({
      id: id++, type, charge: 1,
      px: boostPt - px1, py: -py1, pz: -pz1,
      energy: Math.sqrt(e * e + boostPt * boostPt - 2 * boostPt * px1),
      eta: eta2, phi: phiFromPxPy(boostPt - px1, -py1),
      pt: pt1, mass, trackPoints: points2,
      vertex: { x: vx, y: vy, z: vz }, isSignal: true,
    });
  }
  const nBg = Math.floor(rand(1, 5));
  for (let i = 0; i < nBg; i++) {
    particles.push(sampleParticle(choice([PARTICLE_SPECS[0], PARTICLE_SPECS[1], PARTICLE_SPECS[2], PARTICLE_SPECS[3]]), id++, vx, vy, vz));
  }
  return particles;
}

function buildDijet(idStart: number): Particle[] {
  const particles: Particle[] = [];
  const vz = randn(0, 60);
  const vx = randn(0, 0.03);
  const vy = randn(0, 0.03);
  let id = idStart;
  const dijetPt = Math.exp(rand(Math.log(100), Math.log(1500)));
  const eta1 = rand(-3, 3);
  const phi1 = rand(0, 2 * Math.PI);
  const eta2 = -eta1 + randn(0, 0.3);
  const phi2 = phi1 + Math.PI + randn(0, 0.2);
  const pt2 = dijetPt * rand(0.7, 1.3);
  particles.push({
    id: id++, type: ParticleType.JET, charge: 0,
    px: dijetPt * Math.cos(phi1), py: dijetPt * Math.sin(phi1),
    pz: dijetPt * Math.sinh(eta1),
    energy: dijetPt * Math.cosh(eta1),
    eta: eta1, phi: phi1, pt: dijetPt, mass: 0,
    trackPoints: generateJetConePoints(eta1, phi1, dijetPt, vx, vy, vz),
    vertex: { x: vx, y: vy, z: vz }, isSignal: false,
  });
  particles.push({
    id: id++, type: ParticleType.JET, charge: 0,
    px: pt2 * Math.cos(phi2), py: pt2 * Math.sin(phi2),
    pz: pt2 * Math.sinh(eta2),
    energy: pt2 * Math.cosh(eta2),
    eta: eta2, phi: phi2, pt: pt2, mass: 0,
    trackPoints: generateJetConePoints(eta2, phi2, pt2, vx, vy, vz),
    vertex: { x: vx, y: vy, z: vz }, isSignal: false,
  });
  const nSoft = Math.floor(rand(3, 12));
  for (let i = 0; i < nSoft; i++) {
    const spec = choice([PARTICLE_SPECS[0], PARTICLE_SPECS[1], PARTICLE_SPECS[2]]);
    particles.push(sampleParticle({ ...spec, ptRange: [0.5, 8], probability: 1 }, id++, vx, vy, vz));
  }
  return particles;
}

function buildQCD(idStart: number): Particle[] {
  const particles: Particle[] = [];
  const vz = randn(0, 70);
  const vx = randn(0, 0.04);
  const vy = randn(0, 0.04);
  let id = idStart;
  const nParticles = Math.floor(rand(20, 80));
  for (let i = 0; i < nParticles; i++) {
    let total = 0;
    const r = Math.random();
    let spec = PARTICLE_SPECS[3];
    for (const s of PARTICLE_SPECS) {
      total += s.probability;
      if (r < total) {
        spec = s;
        break;
      }
    }
    const particle = sampleParticle({
      ...spec,
      ptRange: [Math.max(0.3, spec.ptRange[0] * 0.3), spec.ptRange[1] * 0.5],
      probability: 1,
    }, id++, vx, vy, vz);
    particles.push(particle);
  }
  return particles;
}

function buildTTbar(idStart: number): Particle[] {
  const particles: Particle[] = [];
  const vz = randn(0, 50);
  const vx = randn(0, 0.02);
  const vy = randn(0, 0.02);
  let id = idStart;
  for (let i = 0; i < 2; i++) {
    particles.push(sampleParticle(PARTICLE_SPECS[5], id++, vx, vy, vz));
  }
  for (let i = 0; i < 2; i++) {
    const mode = Math.random();
    if (mode < 0.4) {
      particles.push(sampleParticle(PARTICLE_SPECS[1], id++, vx, vy, vz));
    } else if (mode < 0.8) {
      particles.push(sampleParticle(PARTICLE_SPECS[0], id++, vx, vy, vz));
    } else {
      particles.push(sampleParticle(PARTICLE_SPECS[4], id++, vx, vy, vz));
    }
  }
  for (let i = 0; i < 4; i++) {
    particles.push(sampleParticle(PARTICLE_SPECS[3], id++, vx, vy, vz));
  }
  const nExtra = Math.floor(rand(3, 10));
  for (let i = 0; i < nExtra; i++) {
    particles.push(sampleParticle(choice([PARTICLE_SPECS[0], PARTICLE_SPECS[1], PARTICLE_SPECS[2]]), id++, vx, vy, vz));
  }
  return particles;
}

function buildWENu(idStart: number): Particle[] {
  const particles: Particle[] = [];
  const vz = randn(0, 50);
  const vx = randn(0, 0.02);
  const vy = randn(0, 0.02);
  let id = idStart;
  const wPt = Math.exp(rand(Math.log(30), Math.log(200)));
  const lepEta = rand(-2.5, 2.5);
  const lepPhi = rand(0, 2 * Math.PI);
  const lepPt = Math.exp(rand(Math.log(20), Math.log(100)));
  const lepType = Math.random() > 0.5 ? ParticleType.ELECTRON : ParticleType.MUON;
  const lepCharge = Math.random() > 0.5 ? 1 : -1;
  const lepMass = PARTICLE_MASSES[lepType];
  const lepP = lepPt / Math.sin(2 * Math.atan(Math.exp(-lepEta)));
  const lepE = Math.sqrt(lepP * lepP + lepMass * lepMass);
  particles.push({
    id: id++, type: lepType, charge: lepCharge,
    px: lepPt * Math.cos(lepPhi) + wPt,
    py: lepPt * Math.sin(lepPhi),
    pz: lepP * Math.cos(2 * Math.atan(Math.exp(-lepEta))),
    energy: lepE,
    eta: lepEta, phi: phiFromPxPy(lepPt * Math.cos(lepPhi) + wPt, lepPt * Math.sin(lepPhi)),
    pt: lepPt, mass: lepMass,
    trackPoints: generateHelixTrack({ x: vx, y: vy, z: vz }, lepPt, lepPhi, lepEta, lepCharge, 2.0, 50),
    vertex: { x: vx, y: vy, z: vz }, isSignal: true,
  });
  const nJets = Math.floor(rand(0, 4));
  for (let i = 0; i < nJets; i++) {
    particles.push(sampleParticle(PARTICLE_SPECS[3], id++, vx, vy, vz));
  }
  return particles;
}

const SIGNATURE_TYPES: SignatureEvent[] = [
  { type: 'higgs_zz', probability: 0.08, build: () => buildHiggsZZ(1) },
  { type: 'z_mumu', probability: 0.15, build: () => buildZToLL(1, 'mumu') },
  { type: 'z_ee', probability: 0.14, build: () => buildZToLL(1, 'ee') },
  { type: 'dijet', probability: 0.22, build: () => buildDijet(1) },
  { type: 'ttbar', probability: 0.09, build: () => buildTTbar(1) },
  { type: 'w_enum', probability: 0.12, build: () => buildWENu(1) },
  { type: 'qcd', probability: 0.20, build: () => buildQCD(1) },
];

function generateEnergyDeposits(particles: Particle[]): EnergyDeposit[] {
  const deposits: EnergyDeposit[] = [];
  const layers: DetectorLayer[] = [
    DetectorLayer.EM_CALO, DetectorLayer.HAD_CALO, DetectorLayer.MUON_CHAMBER,
  ];
  let id = 0;
  for (const p of particles) {
    if (p.type === ParticleType.PHOTON || p.type === ParticleType.ELECTRON) {
      deposits.push({
        detectorId: id++,
        layer: DetectorLayer.EM_CALO,
        eta: p.eta + randn(0, 0.02),
        phi: p.phi + randn(0, 0.02),
        z: Math.sinh(p.eta) * 500,
        energy: p.energy * rand(0.7, 1.0),
      });
    } else if (p.type === ParticleType.JET || p.type === ParticleType.TAU || p.type === ParticleType.BQUARK) {
      deposits.push({
        detectorId: id++,
        layer: DetectorLayer.EM_CALO,
        eta: p.eta + randn(0, 0.05),
        phi: p.phi + randn(0, 0.05),
        z: Math.sinh(p.eta) * 500,
        energy: p.energy * rand(0.2, 0.5),
      });
      deposits.push({
        detectorId: id++,
        layer: DetectorLayer.HAD_CALO,
        eta: p.eta + randn(0, 0.08),
        phi: p.phi + randn(0, 0.08),
        z: Math.sinh(p.eta) * 700,
        energy: p.energy * rand(0.4, 0.7),
      });
    } else if (p.type === ParticleType.MUON) {
      deposits.push({
        detectorId: id++,
        layer: DetectorLayer.MUON_CHAMBER,
        eta: p.eta + randn(0, 0.03),
        phi: p.phi + randn(0, 0.03),
        z: Math.sinh(p.eta) * 1100,
        energy: p.energy * rand(0.01, 0.08),
      });
    }
  }
  for (let i = 0; i < 50; i++) {
    deposits.push({
      detectorId: id++,
      layer: choice(layers),
      eta: rand(-4, 4),
      phi: rand(0, 2 * Math.PI),
      z: rand(-1500, 1500),
      energy: Math.exp(rand(Math.log(0.01), Math.log(2))),
    });
  }
  return deposits;
}

export async function generateMockEvents(count: number = 30): Promise<PhysicsEvent[]> {
  await new Promise(r => setTimeout(r, 300));
  const events: PhysicsEvent[] = [];
  const startTime = Date.now() - count * 1000 * 25;
  for (let i = 0; i < count; i++) {
    let total = 0;
    const r = Math.random();
    let sig = SIGNATURE_TYPES[SIGNATURE_TYPES.length - 1];
    for (const s of SIGNATURE_TYPES) {
      total += s.probability;
      if (r < total) { sig = s; break; }
    }
    const particles = sig.build();
    const met = calcMissingET(particles);
    const totalET = scalarSumET(particles);
    events.push({
      eventId: 100000 + i,
      runNumber: 300000 + Math.floor(i / 100),
      luminosityBlock: 100 + i,
      timestamp: startTime + i * 1000 * 25,
      particles,
      energyDeposits: generateEnergyDeposits(particles),
      totalET,
      missingET: met,
    });
  }
  return events;
}

export const SIGNATURE_LABELS: Record<string, string> = {
  higgs_zz: 'H→ZZ*→4l 希格斯信号',
  z_mumu: 'Z→μμ  Drell-Yan',
  z_ee: 'Z→ee  Drell-Yan',
  dijet: '双喷注 QCD',
  ttbar: 'tt̄ 顶夸克对',
  w_enum: 'W→eν/μν',
  qcd: 'QCD 多粒子本底',
};
