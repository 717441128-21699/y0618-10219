import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { Particle } from '@/types/physics';

interface JetConeProps {
  particles: Particle[];
  selectedIds: Set<number>;
  onJetClick?: (p: Particle, e: any) => void;
  onJetHover?: (p: Particle | null) => void;
}

function JetConeMesh({
  particle, selected, onClick, onPointerOver, onPointerOut,
}: {
  particle: Particle;
  selected: boolean;
  onClick?: (p: Particle, e: any) => void;
  onPointerOver?: (e: any) => void;
  onPointerOut?: () => void;
}) {
  const cone = useMemo(() => {
    const coneAngle = Math.max(0.08, 0.35 - particle.pt / 2500);
    const length = 2000;
    const height = length;
    const radius = length * Math.tan(coneAngle);
    const theta = 2 * Math.atan(Math.exp(-particle.eta));
    const phi = particle.phi;
    const dirX = Math.sin(theta) * Math.cos(phi);
    const dirY = Math.cos(theta);
    const dirZ = Math.sin(theta) * Math.sin(phi);
    const dir = new THREE.Vector3(dirX, dirY, dirZ).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
    const euler = new THREE.Euler().setFromQuaternion(q);
    return {
      height,
      radius,
      position: new THREE.Vector3(
        particle.vertex.x + dir.x * (height / 2),
        particle.vertex.z + dir.y * (height / 2),
        particle.vertex.y + dir.z * (height / 2),
      ),
      rotation: [euler.x, euler.y, euler.z] as [number, number, number],
    };
  }, [particle]);
  const ptNorm = Math.min(1, Math.log10(particle.pt + 1) / 3);
  const opacity = selected ? 0.35 + 0.15 * ptNorm : 0.12 + 0.12 * ptNorm;
  const hue = 20 + 10 * ptNorm;
  const sat = 90 + 5 * (1 - ptNorm);
  const lig = 50 + 12 * ptNorm;
  const color = `hsl(${hue}, ${sat}%, ${lig}%)`;
  return (
    <group position={cone.position.toArray()}>
      <mesh rotation={cone.rotation}
        onClick={(e) => { e.stopPropagation(); onClick?.(particle, e); }}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <coneGeometry args={[cone.radius, cone.height, 32, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={cone.rotation}>
        <coneGeometry args={[cone.radius, cone.height, 32, 1, true]} />
        <meshBasicMaterial
          color={color}
          wireframe
          transparent
          opacity={selected ? 0.35 : 0.12}
        />
      </mesh>
      <mesh rotation={cone.rotation} position={[0, cone.height / 2, 0]}>
        <sphereGeometry args={[selected ? 18 : 10, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

const JetCone: React.FC<JetConeProps> = ({ particles, selectedIds, onJetClick, onJetHover }) => {
  const jets = particles.filter(p => p.type === 'jet' || p.type === 'tau' || p.type === 'bquark');
  return (
    <group name="jets">
      {jets.map(p => (
        <JetConeMesh
          key={`jet-${p.id}`}
          particle={p}
          selected={selectedIds.has(p.id)}
          onClick={onJetClick}
          onPointerOver={(e) => { e.stopPropagation(); onJetHover?.(p); }}
          onPointerOut={() => onJetHover?.(null)}
        />
      ))}
    </group>
  );
};

export default JetCone;
