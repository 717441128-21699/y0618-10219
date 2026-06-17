import React, { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stats } from '@react-three/drei';
import * as THREE from 'three';
import DetectorGeometry from './DetectorGeometry';
import TrackRenderer from './TrackRenderer';
import JetCone from './JetCone';
import EnergyHeatmap from './EnergyHeatmap';
import { useEventStore } from '@/store/eventStore';
import { useFilterStore } from '@/store/filterStore';
import { useViewStore } from '@/store/viewStore';
import { useAnalysisStore } from '@/store/analysisStore';
import type { Particle, PhysicsEvent } from '@/types/physics';
import { formatEnergy, formatCount } from '@/utils/format';

interface CameraControllerProps {
  syncViews: boolean;
  onCameraChange?: (camera: THREE.PerspectiveCamera) => void;
}

function CameraController({ syncViews, onCameraChange }: CameraControllerProps) {
  const { camera } = useThree();
  useFrame(() => {
    if (syncViews && onCameraChange) {
      onCameraChange(camera as THREE.PerspectiveCamera);
    }
  });
  return null;
}

function Grid({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <>
      <gridHelper args={[6000, 30, '#1A2340', '#0F1830']} position={[0, 0, 0]} />
      <gridHelper args={[6000, 30, '#1A2340', '#0F1830']} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]} />
    </>
  );
}

function Axes({ visible }: { visible: boolean }) {
  if (!visible) return null;
  const len = 450;
  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2} array={new Float32Array([0, 0, 0, len, 0, 0])} itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#FF4444" />
      </line>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2} array={new Float32Array([0, 0, 0, 0, len, 0])} itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#00FF88" />
      </line>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2} array={new Float32Array([0, 0, 0, 0, 0, len])} itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#00D4FF" />
      </line>
    </group>
  );
}

interface MissingETArrowProps {
  event: PhysicsEvent | null;
  visible: boolean;
}

function MissingETArrow({ event, visible }: MissingETArrowProps) {
  if (!visible || !event) return null;
  const { missingET } = event;
  const len = Math.min(1500, 50 + missingET.et * 8);
  const phi = missingET.phi;
  const x = len * Math.cos(phi);
  const z = len * Math.sin(phi);
  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, 0, x, 0, z])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#FF1744" linewidth={3} />
      </line>
      <mesh position={[x, 0, z]}>
        <coneGeometry args={[30, 70, 12]} />
        <meshBasicMaterial color="#FF1744" />
        <quaternion
          args={[
            ...new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              new THREE.Vector3(x, 0, z).normalize(),
            ).toArray(),
          ]}
        />
      </mesh>
    </group>
  );
}

function Interactions() {
  const toggleParticleSelection = useViewStore(s => s.toggleParticleSelection);
  const addPair = useAnalysisStore(s => s.addPair);
  const selectedParticleIds = useViewStore(s => s.selectedParticleIds);
  const [hoverInfo, setHoverInfo] = useState<string | null>(null);

  const handleClick = useCallback((p: Particle) => {
    toggleParticleSelection(p.id);
    if (selectedParticleIds.size === 1) {
      const first = [...selectedParticleIds][0];
      if (first !== p.id) {
        const filtered = useFilterStore.getState();
        const event = useEventStore.getState().currentEvent;
        if (event) {
          const all = filtered.getFilteredParticles(event);
          const p1 = all.find(x => x.id === first);
          if (p1) addPair(p1, p, event.eventId);
        }
      }
    }
  }, [toggleParticleSelection, addPair, selectedParticleIds]);

  const handleHover = useCallback((p: Particle | null) => {
    if (p) {
      setHoverInfo(`#${p.id} ${p.type.toUpperCase()} pT=${formatEnergy(p.pt)}`);
    } else {
      setHoverInfo(null);
    }
  }, []);

  return (
    <>
      <DetectorsLayer onClick={handleClick} onHover={handleHover} />
      {hoverInfo && (
        <div className="pointer-events-none absolute left-4 bottom-20 z-20 bg-black/80 text-[11px] font-mono text-white px-3 py-1 rounded border border-cyan-500/40">
          {hoverInfo}
        </div>
      )}
    </>
  );
}

function DetectorsLayer({
  onClick, onHover,
}: { onClick: (p: Particle) => void; onHover: (p: Particle | null) => void }) {
  const currentEvent = useEventStore(s => s.currentEvent);
  const getFiltered = useFilterStore(s => s.getFilteredParticles);
  const selectedIds = useViewStore(s => s.selectedParticleIds);
  const showTrackPoints = useViewStore(s => s.showTrackPoints);
  const particles = getFiltered(currentEvent);
  return (
    <>
      <TrackRenderer
        particles={particles.filter(p => p.type !== 'jet' && p.type !== 'tau' && p.type !== 'bquark')}
        selectedIds={selectedIds}
        onParticleClick={(p) => onClick(p)}
        onParticleHover={onHover}
        showTrackPoints={showTrackPoints}
      />
      <JetCone
        particles={particles}
        selectedIds={selectedIds}
        onJetClick={(p) => onClick(p)}
        onJetHover={onHover}
      />
    </>
  );
}

const SceneContent: React.FC<{
  onCameraChange: (c: THREE.PerspectiveCamera) => void;
  syncViews: boolean;
}> = ({ onCameraChange, syncViews }) => {
  const showHeatmap = useViewStore(s => s.showEnergyHeatmap);
  const heatmapOpacity = useViewStore(s => s.heatmapOpacity);
  const showDetector = useViewStore(s => s.showDetectorGeometry);
  const detOpacity = useViewStore(s => s.detectorOpacity);
  const showGrid = useViewStore(s => s.showGrid);
  const showAxes = useViewStore(s => s.showAxes);
  const showMET = useViewStore(s => s.showMissingET);
  const currentEvent = useEventStore(s => s.currentEvent);
  const bg = useViewStore(s => s.backgroundColor);
  return (
    <>
      <color attach="background" args={[bg]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[0, 1, 1]} intensity={0.8} />
      <directionalLight position={[-1, -1, 0]} intensity={0.3} />
      <CameraController syncViews={syncViews} onCameraChange={onCameraChange} />
      <DetectorGeometry opacity={detOpacity} visible={showDetector} />
      <EnergyHeatmap
        deposits={currentEvent?.energyDeposits || []}
        opacity={heatmapOpacity}
        visible={showHeatmap}
      />
      <MissingETArrow event={currentEvent} visible={showMET} />
      <Interactions />
      <Grid visible={showGrid} />
      <Axes visible={showAxes} />
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={400}
        maxDistance={20000}
        makeDefault
      />
    </>
  );
};

export interface View3DHandle {
  getCanvas: () => HTMLCanvasElement | null;
  resetCamera: () => void;
}

interface View3DProps {
  onCameraSnapshot?: (pos: { x: number; y: number; z: number }, target: { x: number; y: number; z: number }) => void;
}

const View3D: React.ForwardRefExoticComponent<View3DProps & React.RefAttributes<View3DHandle>> =
  React.forwardRef<View3DHandle, View3DProps>(({ onCameraSnapshot }, ref) => {
    const currentEvent = useEventStore(s => s.currentEvent);
    const totalEvents = useEventStore(s => s.totalEvents);
    const currentIndex = useEventStore(s => s.currentEventIndex);
    const loadedFormat = useEventStore(s => s.loadedFormat);
    const syncViews = useViewStore(s => s.syncViews);
    const getFiltered = useFilterStore(s => s.getFilteredParticles);
    const containerRef = useRef<HTMLDivElement>(null);
    const controlsRef = useRef<any>(null);

    React.useImperativeHandle(ref, () => ({
      getCanvas: () => containerRef.current?.querySelector('canvas') || null,
      resetCamera: () => {
        if (controlsRef.current) {
          controlsRef.current.reset();
        }
      },
    }));

    const filteredCount = getFiltered(currentEvent).length;
    const totalParticles = currentEvent?.particles.length || 0;

    const handleCameraChange = useCallback((c: THREE.PerspectiveCamera) => {
      if (onCameraSnapshot) {
        onCameraSnapshot(
          { x: c.position.x, y: c.position.y, z: c.position.z },
          { x: 0, y: 0, z: 0 },
        );
      }
    }, [onCameraSnapshot]);

    return (
      <div ref={containerRef} data-export-scope="main-view"
        className="relative h-full w-full overflow-hidden rounded-md border border-[#2A3352] bg-[#050810]">
        <Canvas
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        >
          <Suspense fallback={null}>
            <PerspectiveCamera makeDefault fov={50} position={[2200, 1800, 2200]} near={50} far={50000} />
            <SceneContent syncViews={syncViews} onCameraChange={handleCameraChange} />
          </Suspense>
        </Canvas>
        <div className="pointer-events-none absolute right-3 top-3 z-10 space-y-1 font-mono text-[10.5px] leading-tight">
          <div className="rounded bg-black/60 px-2 py-1 text-cyan-300 backdrop-blur-sm border border-cyan-500/30">
            EVENT {currentEvent?.eventId ?? '---'} <span className="text-slate-400">({currentIndex + 1}/{totalEvents})</span>
          </div>
          <div className="rounded bg-black/60 px-2 py-1 text-amber-300 backdrop-blur-sm border border-amber-500/20">
            FORMAT: {loadedFormat?.toUpperCase() ?? 'NONE'}
          </div>
          <div className="rounded bg-black/60 px-2 py-1 text-slate-200 backdrop-blur-sm border border-slate-500/20">
            可见粒子 <span className="text-emerald-400">{filteredCount}</span> / 总 <span className="text-slate-300">{formatCount(totalParticles)}</span>
          </div>
          {currentEvent && (
            <div className="rounded bg-black/60 px-2 py-1 text-rose-300 backdrop-blur-sm border border-rose-500/20">
              ΣET {formatEnergy(currentEvent.totalET)} · MET {formatEnergy(currentEvent.missingET.et)}
            </div>
          )}
        </div>
        <div className="pointer-events-none absolute left-3 top-3 z-10 font-mono text-[9.5px] text-slate-400 space-y-0.5">
          <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm bg-[#FF4444]/70" />X (红)</div>
          <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm bg-[#00FF88]/70" />Z 束流 (绿)</div>
          <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm bg-[#00D4FF]/70" />Y (青)</div>
        </div>
      </div>
    );
  });

View3D.displayName = 'View3D';
export default View3D;
