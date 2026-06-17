import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import type { Particle, ParticleType } from '@/types/physics';
import { PARTICLE_COLORS, PARTICLE_LINE_STYLES } from '@/utils/colors';

interface TrackRendererProps {
  particles: Particle[];
  selectedIds: Set<number>;
  onParticleClick?: (p: Particle, event: any) => void;
  onParticleHover?: (p: Particle | null) => void;
  showTrackPoints: boolean;
}

interface SingleTrackProps {
  particle: Particle;
  color: string;
  selected: boolean;
  opacity: number;
  onClick?: (p: Particle, e: any) => void;
  onPointerOver?: (e: any) => void;
  onPointerOut?: (e: any) => void;
}

function SolidTrack({ particle, color, selected, opacity, onClick, onPointerOver, onPointerOut }: SingleTrackProps) {
  const { geometry } = useMemo(() => {
    const pts = particle.trackPoints;
    const positions = new Float32Array(pts.length * 3);
    for (let i = 0; i < pts.length; i++) {
      positions[i * 3] = pts[i].x;
      positions[i * 3 + 1] = pts[i].z;
      positions[i * 3 + 2] = pts[i].y;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return { geometry: g };
  }, [particle]);
  const lineWidth = selected ? 3.5 : 1.8;
  const points = useMemo(() =>
    particle.trackPoints.map(p => new THREE.Vector3(p.x, p.z, p.y)),
    [particle]);
  return (
    <group>
      <Line
        points={points}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={opacity * (selected ? 1 : 0.9)}
      />
      <mesh
        onClick={(e) => { e.stopPropagation(); onClick?.(particle, e); }}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <tubeGeometry args={[
          new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5),
          Math.max(8, particle.trackPoints.length * 2),
          lineWidth * 1.5,
          6,
          false,
        ]} />
        <meshBasicMaterial color={color} transparent opacity={0} />
      </mesh>
    </group>
  );
}

function DashedTrack({ particle, color, selected, opacity, onClick, onPointerOver, onPointerOut }: SingleTrackProps) {
  const geometry = useMemo(() => {
    const pts = particle.trackPoints;
    const positions = new Float32Array(pts.length * 3);
    for (let i = 0; i < pts.length; i++) {
      positions[i * 3] = pts[i].x;
      positions[i * 3 + 1] = pts[i].z;
      positions[i * 3 + 2] = pts[i].y;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setDrawRange(0, pts.length);
    g.computeBoundingBox();
    return g;
  }, [particle]);
  const points = useMemo(() =>
    particle.trackPoints.map(p => new THREE.Vector3(p.x, p.z, p.y)),
    [particle]);
  return (
    <group>
      <Line
        points={points}
        color={color}
        dashed
        dashSize={selected ? 20 : 14}
        gapSize={selected ? 8 : 10}
        lineWidth={selected ? 2.5 : 1.5}
        transparent
        opacity={opacity * (selected ? 1 : 0.85)}
      />
      <mesh
        onClick={(e) => { e.stopPropagation(); onClick?.(particle, e); }}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <tubeGeometry args={[
          new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5),
          Math.max(8, particle.trackPoints.length * 2),
          selected ? 5 : 2.5,
          6, false,
        ]} />
        <meshBasicMaterial color={color} transparent opacity={0} />
      </mesh>
    </group>
  );
}

function DottedTrack({ particle, color, selected, opacity, onClick, onPointerOver, onPointerOut }: SingleTrackProps) {
  const positions = useMemo(() => {
    const pts = particle.trackPoints;
    const arr = new Float32Array(pts.length * 3);
    for (let i = 0; i < pts.length; i++) {
      arr[i * 3] = pts[i].x;
      arr[i * 3 + 1] = pts[i].z;
      arr[i * 3 + 2] = pts[i].y;
    }
    return arr;
  }, [particle]);
  return (
    <group>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color={color}
          size={selected ? 10 : 6}
          sizeAttenuation
          transparent
          opacity={opacity}
        />
      </points>
      <mesh
        onClick={(e) => { e.stopPropagation(); onClick?.(particle, e); }}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <tubeGeometry args={[
          new THREE.CatmullRomCurve3(particle.trackPoints.map(
            p => new THREE.Vector3(p.x, p.z, p.y)
          )),
          Math.max(8, particle.trackPoints.length * 2),
          selected ? 6 : 3.5, 6, false,
        ]} />
        <meshBasicMaterial color={color} transparent opacity={0} />
      </mesh>
    </group>
  );
}

const TrackRenderer: React.FC<TrackRendererProps> = ({
  particles, selectedIds, onParticleClick, onParticleHover, showTrackPoints,
}) => {
  const rendered = useMemo(() => {
    return particles.map((p) => {
      const color = PARTICLE_COLORS[p.type as ParticleType] || '#ffffff';
      const selected = selectedIds.has(p.id);
      const opacity = selected ? 1 : 0.82;
      const style = PARTICLE_LINE_STYLES[p.type as ParticleType];
      const common = {
        particle: p,
        color,
        selected,
        opacity,
        onClick: onParticleClick,
        onPointerOver: (e: any) => { e.stopPropagation(); onParticleHover?.(p); },
        onPointerOut: () => onParticleHover?.(null),
      };
      const key = `trk-${p.id}`;
      switch (style) {
        case 'dashed':
          return <DashedTrack key={key} {...common} />;
        case 'dotted':
          return <DottedTrack key={key} {...common} />;
        case 'none':
          return null;
        case 'solid':
        default:
          return <SolidTrack key={key} {...common} />;
      }
    });
  }, [particles, selectedIds, onParticleClick, onParticleHover]);

  const trackPointMarkers = useMemo(() => {
    if (!showTrackPoints) return null;
    const allPts: { x: number; y: number; z: number; c: string }[] = [];
    for (const p of particles) {
      const color = PARTICLE_COLORS[p.type as ParticleType];
      for (const tp of p.trackPoints) {
        allPts.push({ x: tp.x, y: tp.z, z: tp.y, c: color });
      }
    }
    if (allPts.length === 0) return null;
    const pos = new Float32Array(allPts.length * 3);
    const col = new Float32Array(allPts.length * 3);
    allPts.forEach((pt, i) => {
      pos[i * 3] = pt.x; pos[i * 3 + 1] = pt.y; pos[i * 3 + 2] = pt.z;
      const c = new THREE.Color(pt.c);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    });
    return (
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={allPts.length} array={pos} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={allPts.length} array={col} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={3} vertexColors sizeAttenuation transparent opacity={0.9} />
      </points>
    );
  }, [particles, showTrackPoints]);

  return (
    <group name="tracks">
      {rendered}
      {trackPointMarkers}
    </group>
  );
};

export default TrackRenderer;
