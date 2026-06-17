export interface DetectorDimensions {
  beamPipe: {
    radius: number;
    length: number;
  };
  pixel: {
    innerRadius: number;
    outerRadius: number;
    halfLength: number;
    layers: number;
  };
  sct: {
    innerRadius: number;
    outerRadius: number;
    halfLength: number;
    layers: number;
  };
  trt: {
    innerRadius: number;
    outerRadius: number;
    halfLength: number;
    layers: number;
  };
  emCalo: {
    innerRadius: number;
    outerRadius: number;
    halfLength: number;
  };
  hadCalo: {
    innerRadius: number;
    outerRadius: number;
    halfLength: number;
  };
  muonChamber: {
    innerRadius: number;
    outerRadius: number;
    halfLength: number;
    layers: number;
  };
  endcap: {
    zMin: number;
    zMax: number;
    innerRadius: number;
    outerRadius: number;
  };
}

export const ATLAS_LIKE_DETECTOR: DetectorDimensions = {
  beamPipe: { radius: 30, length: 6200 },
  pixel: { innerRadius: 50, outerRadius: 230, halfLength: 650, layers: 4 },
  sct: { innerRadius: 299, outerRadius: 514, halfLength: 1450, layers: 4 },
  trt: { innerRadius: 554, outerRadius: 1066, halfLength: 1750, layers: 70 },
  emCalo: { innerRadius: 1150, outerRadius: 1450, halfLength: 2000 },
  hadCalo: { innerRadius: 1480, outerRadius: 2030, halfLength: 2100 },
  muonChamber: { innerRadius: 4600, outerRadius: 11000, halfLength: 7400, layers: 3 },
  endcap: { zMin: 2200, zMax: 7000, innerRadius: 500, outerRadius: 2000 },
};

export const COMPACT_DETECTOR: DetectorDimensions = {
  beamPipe: { radius: 15, length: 2500 },
  pixel: { innerRadius: 25, outerRadius: 80, halfLength: 250, layers: 3 },
  sct: { innerRadius: 100, outerRadius: 180, halfLength: 500, layers: 3 },
  trt: { innerRadius: 200, outerRadius: 360, halfLength: 650, layers: 30 },
  emCalo: { innerRadius: 400, outerRadius: 520, halfLength: 750 },
  hadCalo: { innerRadius: 540, outerRadius: 720, halfLength: 800 },
  muonChamber: { innerRadius: 1600, outerRadius: 3800, halfLength: 2800, layers: 2 },
  endcap: { zMin: 850, zMax: 2500, innerRadius: 180, outerRadius: 720 },
};

export const USED_DETECTOR = COMPACT_DETECTOR;

export function etaToRadius(eta: number): number {
  const theta = 2 * Math.atan(Math.exp(-eta));
  return Math.abs(Math.tan(theta));
}

export function etaPhiToXY(
  eta: number,
  phi: number,
  detectorRadius: number,
): { x: number; y: number } {
  const tanTheta = etaToRadius(eta);
  const r = detectorRadius;
  const z = r / tanTheta;
  return {
    x: r * Math.cos(phi) / (tanTheta === Infinity ? 1 : 1),
    y: r * Math.sin(phi) / (tanTheta === Infinity ? 1 : 1),
  };
  void z;
}

export function etaPhiZToPosition(
  eta: number,
  phi: number,
  z: number,
): { x: number; y: number; z: number } {
  const tanTheta = etaToRadius(eta);
  const r = Math.abs(z) * tanTheta;
  return {
    x: r * Math.cos(phi),
    y: r * Math.sin(phi),
    z,
  };
}
