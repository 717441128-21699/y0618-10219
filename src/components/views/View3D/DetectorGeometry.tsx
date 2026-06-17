import React, { useMemo } from 'react';
import * as THREE from 'three';
import { USED_DETECTOR } from '@/services/physics/detectorGeometry';

interface DetectorGeometryProps {
  opacity: number;
  visible: boolean;
}

const COLOR_TRACKER = '#4A6FA5';
const COLOR_EM = '#9B5DE5';
const COLOR_HAD = '#F15BB5';
const COLOR_MUON = '#00BBF9';
const COLOR_BEAM = '#00FF88';

function CylinderLayer({
  innerR, outerR, length, color, opacity, radialSegments = 48,
}: {
  innerR: number; outerR: number; length: number; color: string;
  opacity: number; radialSegments?: number;
}) {
  const outerGeom = useMemo(
    () => new THREE.CylinderGeometry(outerR, outerR, length * 2, radialSegments, 1, true),
    [outerR, length, radialSegments],
  );
  const innerGeom = useMemo(
    () => new THREE.CylinderGeometry(innerR, innerR, length * 2, radialSegments, 1, true),
    [innerR, length, radialSegments],
  );
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: opacity * 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
      wireframe: false,
    }),
    [color, opacity],
  );
  return (
    <group>
      <mesh geometry={outerGeom} material={material} />
      <mesh geometry={innerGeom} material={material} />
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, length, 0]}>
        <ringGeometry args={[innerR, outerR, radialSegments]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.15} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -length, 0]}>
        <ringGeometry args={[innerR, outerR, radialSegments]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.15} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function TrackerLayers({
  innerR, outerR, length, layers, color, opacity,
}: {
  innerR: number; outerR: number; length: number; layers: number;
  color: string; opacity: number;
}) {
  const items = useMemo(() => {
    const step = (outerR - innerR) / Math.max(1, layers - 1);
    return Array.from({ length: layers }, (_, i) => {
      const r = innerR + i * step;
      return (
        <mesh key={i}>
          <cylinderGeometry args={[r, r, length * 2, 64, 1, true]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={opacity * 0.35}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      );
    });
  }, [innerR, outerR, length, layers, color, opacity]);
  return <group>{items}</group>;
}

function EndcapDiscs({
  zMin, zMax, innerR, outerR, color, opacity, count = 6,
}: {
  zMin: number; zMax: number; innerR: number; outerR: number;
  color: string; opacity: number; count?: number;
}) {
  const discs = useMemo(() => {
    const step = (zMax - zMin) / Math.max(1, count - 1);
    const arr = [];
    for (let i = 0; i < count; i++) {
      const z = zMin + i * step;
      arr.push(
        <group key={`pos-${i}`} position={[0, z, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh>
            <ringGeometry args={[innerR, outerR, 64]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={opacity * 0.25}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>,
        <group key={`neg-${i}`} position={[0, -z, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh>
            <ringGeometry args={[innerR, outerR, 64]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={opacity * 0.25}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>,
      );
    }
    return arr;
  }, [zMin, zMax, innerR, outerR, color, opacity, count]);
  return <group>{discs}</group>;
}

const DetectorGeometry: React.FC<DetectorGeometryProps> = ({ opacity, visible }) => {
  if (!visible) return null;
  const d = USED_DETECTOR;

  return (
    <group name="detector">
      <mesh>
        <cylinderGeometry args={[d.beamPipe.radius, d.beamPipe.radius, d.beamPipe.length, 32, 1, true]} />
        <meshBasicMaterial color={COLOR_BEAM} transparent opacity={opacity * 0.8} side={THREE.DoubleSide} />
      </mesh>
      <TrackerLayers
        innerR={d.pixel.innerRadius}
        outerR={d.pixel.outerRadius}
        length={d.pixel.halfLength}
        layers={d.pixel.layers}
        color={COLOR_TRACKER}
        opacity={opacity}
      />
      <TrackerLayers
        innerR={d.sct.innerRadius}
        outerR={d.sct.outerRadius}
        length={d.sct.halfLength}
        layers={d.sct.layers}
        color={'#5C821A'}
        opacity={opacity}
      />
      <TrackerLayers
        innerR={d.trt.innerRadius}
        outerR={d.trt.outerRadius}
        length={d.trt.halfLength}
        layers={8}
        color={'#C46352'}
        opacity={opacity * 0.6}
      />
      <CylinderLayer
        innerR={d.emCalo.innerRadius}
        outerR={d.emCalo.outerRadius}
        length={d.emCalo.halfLength}
        color={COLOR_EM}
        opacity={opacity}
      />
      <CylinderLayer
        innerR={d.hadCalo.innerRadius}
        outerR={d.hadCalo.outerRadius}
        length={d.hadCalo.halfLength}
        color={COLOR_HAD}
        opacity={opacity}
      />
      <EndcapDiscs
        zMin={d.endcap.zMin}
        zMax={d.endcap.zMax}
        innerR={d.endcap.innerRadius}
        outerR={d.endcap.outerRadius}
        color={COLOR_EM}
        opacity={opacity}
        count={5}
      />
      <TrackerLayers
        innerR={d.muonChamber.innerRadius}
        outerR={d.muonChamber.outerRadius}
        length={d.muonChamber.halfLength}
        layers={d.muonChamber.layers}
        color={COLOR_MUON}
        opacity={opacity * 0.8}
      />
      <group>
        <mesh>
          <cylinderGeometry args={[4, 4, d.beamPipe.length * 1.05, 12]} />
          <meshBasicMaterial color={COLOR_BEAM} transparent opacity={opacity * 0.6} />
        </mesh>
        <mesh position={[0, d.beamPipe.length * 0.55, 0]}>
          <coneGeometry args={[12, 40, 12]} />
          <meshBasicMaterial color={COLOR_BEAM} transparent opacity={opacity * 0.7} />
        </mesh>
        <mesh position={[0, -d.beamPipe.length * 0.55, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[12, 40, 12]} />
          <meshBasicMaterial color={COLOR_BEAM} transparent opacity={opacity * 0.7} />
        </mesh>
      </group>
    </group>
  );
};

export default DetectorGeometry;
