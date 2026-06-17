import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { EnergyDeposit } from '@/types/physics';
import { viridisColor, logNormalize } from '@/utils/colors';
import { USED_DETECTOR } from '@/services/physics/detectorGeometry';

interface EnergyHeatmapProps {
  deposits: EnergyDeposit[];
  opacity: number;
  visible: boolean;
}

const EnergyHeatmap: React.FC<EnergyHeatmapProps> = ({ deposits, opacity, visible }) => {
  const { barrelMesh, endcapMeshes } = useMemo(() => {
    if (!visible) {
      return { barrelMesh: null, endcapMeshes: null };
    }
    const NBINS_ETA = 64;
    const NBINS_PHI = 128;
    const barrel = new Float32Array(NBINS_ETA * NBINS_PHI);
    const posEndcap = new Float32Array(NBINS_ETA * NBINS_PHI);
    const negEndcap = new Float32Array(NBINS_ETA * NBINS_PHI);
    let maxE = 0;

    const etaMin = -3, etaMax = 3;
    const dEta = (etaMax - etaMin) / NBINS_ETA;
    const dPhi = (2 * Math.PI) / NBINS_PHI;

    for (const d of deposits) {
      if (d.eta < etaMin || d.eta >= etaMax) continue;
      let phi = d.phi;
      while (phi < 0) phi += 2 * Math.PI;
      while (phi >= 2 * Math.PI) phi -= 2 * Math.PI;
      const iEta = Math.min(NBINS_ETA - 1, Math.floor((d.eta - etaMin) / dEta));
      const iPhi = Math.min(NBINS_PHI - 1, Math.floor(phi / dPhi));
      const idx = iEta * NBINS_PHI + iPhi;
      const absEta = Math.abs(d.eta);
      if (absEta < 1.5) {
        barrel[idx] += d.energy;
        maxE = Math.max(maxE, barrel[idx]);
      } else if (d.eta >= 1.5) {
        posEndcap[idx] += d.energy;
        maxE = Math.max(maxE, posEndcap[idx]);
      } else {
        negEndcap[idx] += d.energy;
        maxE = Math.max(maxE, negEndcap[idx]);
      }
    }

    const createCylinderTexture = (data: Float32Array, nbEta: number, nbPhi: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = nbPhi;
      canvas.height = nbEta;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      const img = ctx.createImageData(nbPhi, nbEta);
      for (let i = 0; i < nbEta; i++) {
        for (let j = 0; j < nbPhi; j++) {
          const v = data[i * nbPhi + j];
          const t = logNormalize(v, maxE);
          const color = new THREE.Color(viridisColor(t));
          const p = (i * nbPhi + j) * 4;
          img.data[p] = Math.floor(color.r * 255);
          img.data[p + 1] = Math.floor(color.g * 255);
          img.data[p + 2] = Math.floor(color.b * 255);
          img.data[p + 3] = Math.floor((t > 0.02 ? opacity * 255 : 0));
        }
      }
      ctx.putImageData(img, 0, 0);
      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      tex.anisotropy = 4;
      return tex;
    };

    const createDiscTexture = (data: Float32Array, nbEta: number, nbPhi: number, side: 1 | -1) => {
      const SIZE = 256;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.clearRect(0, 0, SIZE, SIZE);
      const cx = SIZE / 2;
      const cy = SIZE / 2;
      for (let r = 1; r < SIZE / 2 - 1; r++) {
        const etaFrac = r / (SIZE / 2 - 1);
        const eta = side > 0 ? 1.5 + etaFrac * 1.5 : -(1.5 + etaFrac * 1.5);
        const iEta = Math.max(0, Math.min(nbEta - 1, Math.floor((eta - etaMin) / dEta)));
        for (let a = 0; a < 360; a++) {
          const phi = (a / 360) * 2 * Math.PI;
          const iPhi = Math.floor(((a / 360) * nbPhi)) % nbPhi;
          const v = data[iEta * nbPhi + iPhi];
          const t = logNormalize(v, maxE);
          if (t < 0.02) continue;
          const color = viridisColor(t);
          const x = cx + r * Math.cos(phi);
          const y = cy + r * Math.sin(phi);
          ctx.fillStyle = color;
          ctx.globalAlpha = t * opacity;
          ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
        }
      }
      ctx.globalAlpha = 1;
      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      return tex;
    };

    const barrelTex = createCylinderTexture(barrel, NBINS_ETA, NBINS_PHI);
    const posTex = createDiscTexture(posEndcap, NBINS_ETA, NBINS_PHI, 1);
    const negTex = createDiscTexture(negEndcap, NBINS_ETA, NBINS_PHI, -1);
    const barrelRadius = USED_DETECTOR.emCalo.outerRadius + 40;
    const barrelLen = USED_DETECTOR.emCalo.halfLength * 2;
    const endcapR1 = 150;
    const endcapR2 = barrelRadius + 50;
    const endcapZ = USED_DETECTOR.endcap.zMin + 100;

    return {
      barrelMesh: barrelTex ? (
        <mesh key="heatmap-barrel">
          <cylinderGeometry args={[barrelRadius, barrelRadius, barrelLen, NBINS_PHI, 1, true]} />
          <meshBasicMaterial
            map={barrelTex}
            transparent
            opacity={1}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ) : null,
      endcapMeshes: (posTex && negTex) ? (
        <>
          <group position={[0, endcapZ, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh>
              <ringGeometry args={[endcapR1, endcapR2, 128]} />
              <meshBasicMaterial
                map={posTex}
                transparent
                opacity={1}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          </group>
          <group position={[0, -endcapZ, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh>
              <ringGeometry args={[endcapR1, endcapR2, 128]} />
              <meshBasicMaterial
                map={negTex}
                transparent
                opacity={1}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          </group>
        </>
      ) : null,
    };
  }, [deposits, opacity, visible]);

  if (!visible) return null;
  return (
    <group name="heatmap">
      {barrelMesh}
      {endcapMeshes}
    </group>
  );
};

export default EnergyHeatmap;
