import type { Particle, Vector3 } from '@/types/physics';

export function invariantMass(p1: Particle, p2: Particle): number {
  const e = p1.energy + p2.energy;
  const px = p1.px + p2.px;
  const py = p1.py + p2.py;
  const pz = p1.pz + p2.pz;
  const m2 = e * e - px * px - py * py - pz * pz;
  return Math.sqrt(Math.max(0, m2));
}

export function invariantMassFourVector(
  e: number, px: number, py: number, pz: number
): number {
  const m2 = e * e - px * px - py * py - pz * pz;
  return Math.sqrt(Math.max(0, m2));
}

export function deltaPhi(phi1: number, phi2: number): number {
  let dphi = phi1 - phi2;
  while (dphi > Math.PI) dphi -= 2 * Math.PI;
  while (dphi <= -Math.PI) dphi += 2 * Math.PI;
  return dphi;
}

export function deltaEta(eta1: number, eta2: number): number {
  return eta1 - eta2;
}

export function deltaR(p1: { eta: number; phi: number }, p2: { eta: number; phi: number }): number {
  const deta = p1.eta - p2.eta;
  const dphi = deltaPhi(p1.phi, p2.phi);
  return Math.sqrt(deta * deta + dphi * dphi);
}

export function ptFromPxPy(px: number, py: number): number {
  return Math.sqrt(px * px + py * py);
}

export function etaFromTheta(theta: number): number {
  return -Math.log(Math.tan(theta / 2));
}

export function thetaFromEta(eta: number): number {
  return 2 * Math.atan(Math.exp(-eta));
}

export function phiFromPxPy(px: number, py: number): number {
  return Math.atan2(py, px);
}

export function rapidityFromEZ(e: number, pz: number): number {
  return 0.5 * Math.log((e + pz) / (e - pz));
}

export function mtFromPtM(pt: number, mass: number): number {
  return Math.sqrt(pt * pt + mass * mass);
}

export function helicityAngle(
  parent: Particle,
  child: Particle,
  restFrameChild: Particle,
): number {
  return 0;
}

export function vectorMagnitude(v: Vector3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function vectorDot(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function vectorCross(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function generateHelixTrack(
  vertex: Vector3,
  pt: number,
  phi: number,
  eta: number,
  charge: number,
  magneticField: number = 2.0,
  numPoints: number = 40,
  maxRadius: number = 1100,
  maxZ: number = 3000,
): Vector3[] {
  const points: Vector3[] = [];
  const theta = thetaFromEta(eta);
  const s = Math.sign(charge) || 1;
  const R = pt / (0.003 * magneticField);
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  if (sinTheta < 1e-6) {
    for (let i = 0; i < numPoints; i++) {
      const t = (i / (numPoints - 1)) * maxZ;
      const sz = s * t;
      points.push({ x: vertex.x, y: vertex.y, z: vertex.z + sz });
    }
    return points;
  }
  for (let i = 0; i < numPoints; i++) {
    const step = i / (numPoints - 1);
    const arcLength = step * Math.min(maxRadius * 2, 3500);
    const dphi = arcLength / R;
    const r = R * Math.sqrt(2 - 2 * Math.cos(dphi));
    const ang = phi - s * dphi / 2;
    const x = vertex.x + r * Math.cos(ang);
    const y = vertex.y + r * Math.sin(ang);
    const z = vertex.z + (arcLength / sinTheta) * cosTheta;
    if (r > maxRadius || Math.abs(z) > maxZ) break;
    points.push({ x, y, z });
  }
  return points;
}

export function generateStraightTrack(
  vertex: Vector3,
  phi: number,
  eta: number,
  numPoints: number = 20,
  maxLength: number = 3500,
): Vector3[] {
  const points: Vector3[] = [];
  const theta = thetaFromEta(eta);
  const dx = Math.sin(theta) * Math.cos(phi);
  const dy = Math.sin(theta) * Math.sin(phi);
  const dz = Math.cos(theta);
  for (let i = 0; i < numPoints; i++) {
    const t = (i / (numPoints - 1)) * maxLength;
    points.push({
      x: vertex.x + dx * t,
      y: vertex.y + dy * t,
      z: vertex.z + dz * t,
    });
  }
  return points;
}

export function calcMissingET(particles: Particle[]): { et: number; phi: number } {
  let sumX = 0, sumY = 0;
  for (const p of particles) {
    sumX += p.px;
    sumY += p.py;
  }
  const et = Math.sqrt(sumX * sumX + sumY * sumY);
  const phi = Math.atan2(-sumY, -sumX);
  return { et, phi };
}

export function visibleEnergy(particles: Particle[]): number {
  return particles.reduce((s, p) => s + p.energy, 0);
}

export function scalarSumET(particles: Particle[]): number {
  return particles.reduce((s, p) => s + p.pt, 0);
}

export function generateJetConePoints(
  vertex: Vector3,
  pt: number,
  phi: number,
  eta: number,
  radius: number = 0.4,
  numPoints: number = 24,
): Vector3[] {
  const points: Vector3[] = [];
  const theta = thetaFromEta(eta);
  const axis = {
    x: Math.sin(theta) * Math.cos(phi),
    y: Math.sin(theta) * Math.sin(phi),
    z: Math.cos(theta),
  };
  const maxLength = 2800;
  const steps = 16;
  for (let s = 0; s < steps; s++) {
    const t = ((s + 1) / steps) * maxLength;
    const center = {
      x: vertex.x + axis.x * t,
      y: vertex.y + axis.y * t,
      z: vertex.z + axis.z * t,
    };
    const rCone = t * Math.tan(radius * 0.35) + 8 + pt * 0.02;
    for (let a = 0; a < numPoints / steps; a++) {
      const ang = (a / (numPoints / steps)) * Math.PI * 2;
      const perp1 = { x: -axis.y, y: axis.x, z: 0 };
      const p1n = Math.sqrt(perp1.x * perp1.x + perp1.y * perp1.y);
      if (p1n > 1e-9) { perp1.x /= p1n; perp1.y /= p1n; }
      const perp2 = {
        x: axis.y * perp1.z - axis.z * perp1.y,
        y: axis.z * perp1.x - axis.x * perp1.z,
        z: axis.x * perp1.y - axis.y * perp1.x,
      };
      points.push({
        x: center.x + (perp1.x * Math.cos(ang) + perp2.x * Math.sin(ang)) * rCone,
        y: center.y + (perp1.y * Math.cos(ang) + perp2.y * Math.sin(ang)) * rCone,
        z: center.z + (perp1.z * Math.cos(ang) + perp2.z * Math.sin(ang)) * rCone,
      });
    }
  }
  if (points.length === 0) points.push({ ...vertex });
  return points;
}
