import React, { useMemo, useRef, useState } from 'react';
import type { Particle, PhysicsEvent } from '@/types/physics';
import { PARTICLE_COLORS, PARTICLE_LINE_STYLES, viridisColor, logNormalize } from '@/utils/colors';
import { useEventStore } from '@/store/eventStore';
import { useFilterStore } from '@/store/filterStore';
import { useViewStore } from '@/store/viewStore';
import { useAnalysisStore } from '@/store/analysisStore';
import { USED_DETECTOR } from '@/services/physics/detectorGeometry';

const HALF_Z = USED_DETECTOR.muonChamber.halfLength * 1.05;
const MAX_R = USED_DETECTOR.muonChamber.outerRadius * 1.02;

interface LongitudinalSectionProps {
  width?: number;
  height?: number;
}

const LongitudinalSection: React.FC<LongitudinalSectionProps> = ({ width = 400, height = 400 }) => {
  const event = useEventStore(s => s.currentEvent) as PhysicsEvent | null;
  const getFiltered = useFilterStore(s => s.getFilteredParticles);
  const showDetector = useViewStore(s => s.showDetectorGeometry);
  const showHeatmap = useViewStore(s => s.showEnergyHeatmap);
  const heatmapOpacity = useViewStore(s => s.heatmapOpacity);
  const selectedIds = useViewStore(s => s.selectedParticleIds);
  const toggleParticleSelection = useViewStore(s => s.toggleParticleSelection);
  const addPair = useAnalysisStore(s => s.addPair);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<Particle | null>(null);
  const [view, setView] = useState({ zoom: 1, tx: 0, ty: 0 });

  const viewBox = useMemo(() => {
    const aspect = 1;
    const w = HALF_Z * 2 / view.zoom;
    const h = MAX_R * 2 / view.zoom * aspect;
    return `${-w / 2 + view.tx} ${-h / 2 + view.ty} ${w} ${h}`;
  }, [view]);

  function selWidth(n: number) { return n * (1 / Math.max(0.25, view.zoom)); }

  const detector = useMemo(() => {
    if (!showDetector) return null;
    const d = USED_DETECTOR;
    return (
      <g opacity={0.4}>
        <rect x={-d.beamPipe.length / 2} y={-d.beamPipe.radius} width={d.beamPipe.length} height={d.beamPipe.radius * 2}
          fill="none" stroke="#00FF88" strokeWidth={1.2} />
        {Array.from({ length: d.pixel.layers }, (_, i) => {
          const r = d.pixel.innerRadius + i * (d.pixel.outerRadius - d.pixel.innerRadius) / (d.pixel.layers - 1 || 1);
          return (
            <rect key={`pz-${i}`} x={-d.pixel.halfLength} y={-r}
              width={d.pixel.halfLength * 2} height={r * 2}
              fill="none" stroke="#4A6FA5" strokeWidth={0.7} />
          );
        })}
        {Array.from({ length: d.sct.layers }, (_, i) => {
          const r = d.sct.innerRadius + i * (d.sct.outerRadius - d.sct.innerRadius) / (d.sct.layers - 1 || 1);
          return (
            <rect key={`sz-${i}`} x={-d.sct.halfLength} y={-r}
              width={d.sct.halfLength * 2} height={r * 2}
              fill="none" stroke="#5C821A" strokeWidth={0.7} />
          );
        })}
        <rect x={-d.trt.halfLength} y={-d.trt.outerRadius} width={d.trt.halfLength * 2} height={d.trt.outerRadius * 2}
          fill="none" stroke="#C46352" strokeWidth={0.6} strokeDasharray="2 3" />
        <rect x={-d.emCalo.halfLength} y={-d.emCalo.outerRadius} width={d.emCalo.halfLength * 2} height={(d.emCalo.outerRadius - d.emCalo.innerRadius) * 2}
          fill="#9B5DE510" stroke="#9B5DE5" strokeWidth={0.7} />
        <rect x={-d.hadCalo.halfLength} y={-d.hadCalo.outerRadius} width={d.hadCalo.halfLength * 2} height={(d.hadCalo.outerRadius - d.hadCalo.innerRadius) * 2}
          fill="#F15BB510" stroke="#F15BB5" strokeWidth={0.7} />
        {Array.from({ length: d.muonChamber.layers }, (_, i) => {
          const r = d.muonChamber.innerRadius + i * (d.muonChamber.outerRadius - d.muonChamber.innerRadius) / (d.muonChamber.layers - 1 || 1);
          return (
            <rect key={`mz-${i}`} x={-d.muonChamber.halfLength} y={-r}
              width={d.muonChamber.halfLength * 2} height={r * 2}
              fill="none" stroke="#00BBF9" strokeWidth={0.7} strokeDasharray="3 3" />
          );
        })}
        <rect x={d.endcap.zMin} y={-d.endcap.outerRadius} width={d.endcap.zMax - d.endcap.zMin}
          height={d.endcap.outerRadius * 2} fill="#9B5DE508" stroke="#9B5DE555" strokeWidth={0.5} />
        <rect x={-d.endcap.zMax} y={-d.endcap.outerRadius} width={d.endcap.zMax - d.endcap.zMin}
          height={d.endcap.outerRadius * 2} fill="#9B5DE508" stroke="#9B5DE555" strokeWidth={0.5} />
      </g>
    );
  }, [showDetector]);

  const heatmap = useMemo(() => {
    if (!showHeatmap || !event) return null;
    const NZ = 70, NR = 30;
    const data = new Float32Array(NZ * NR);
    let max = 0;
    const Z_MIN = -HALF_Z * 0.8;
    const Z_MAX = HALF_Z * 0.8;
    for (const d of event.energyDeposits) {
      const zi = Math.min(NZ - 1, Math.max(0, Math.floor(((d.z - Z_MIN) / (Z_MAX - Z_MIN)) * NZ)));
      const r = Math.abs(d.z) * Math.tan(2 * Math.atan(Math.exp(-Math.abs(d.eta)))) * 0.8;
      const ri = Math.min(NR - 1, Math.floor((r / MAX_R) * NR));
      for (let dz = -1; dz <= 1; dz++) {
        for (let dr = -1; dr <= 1; dr++) {
          const zz = Math.min(NZ - 1, Math.max(0, zi + dz));
          const rr = Math.min(NR - 1, Math.max(0, ri + dr));
          const ii = zz * NR + rr;
          data[ii] += d.energy * (dz === 0 && dr === 0 ? 1 : 0.4);
          max = Math.max(max, data[ii]);
        }
      }
    }
    const elems: JSX.Element[] = [];
    for (let i = 0; i < NZ; i++) {
      const z0 = Z_MIN + (i / NZ) * (Z_MAX - Z_MIN);
      const z1 = Z_MIN + ((i + 1) / NZ) * (Z_MAX - Z_MIN);
      for (let j = 0; j < NR; j++) {
        const r0 = (j / NR) * MAX_R;
        const r1 = ((j + 1) / NR) * MAX_R;
        const v = data[i * NR + j];
        const t = logNormalize(v, max);
        if (t < 0.04) continue;
        const color = viridisColor(t);
        elems.push(
          <g key={`lhm-${i}-${j}`}>
            <rect x={z0} y={-r1} width={z1 - z0} height={r1 - r0} fill={color} opacity={t * heatmapOpacity} />
            <rect x={z0} y={r0} width={z1 - z0} height={r1 - r0} fill={color} opacity={t * heatmapOpacity} />
          </g>
        );
      }
    }
    return <g>{elems}</g>;
  }, [showHeatmap, event, heatmapOpacity]);

  const particles = useMemo(() => {
    if (!event) return [];
    const filtered = getFiltered(event);
    return filtered.map(p => {
      const color = PARTICLE_COLORS[p.type as keyof typeof PARTICLE_COLORS];
      const style = PARTICLE_LINE_STYLES[p.type as keyof typeof PARTICLE_LINE_STYLES];
      const sel = selectedIds.has(p.id);
      const dash = style === 'dashed' ? '10 6' : style === 'dotted' ? '2 4' : undefined;
      const pts = p.trackPoints.map(tp => `${tp.z.toFixed(1)},${Math.sqrt(tp.x * tp.x + tp.y * tp.y).toFixed(1)}`).join(' ');
      const ptsNeg = p.trackPoints.map(tp => `${tp.z.toFixed(1)},${(-Math.sqrt(tp.x * tp.x + tp.y * tp.y)).toFixed(1)}`).join(' ');
      const jetR = (p.type === 'jet' || p.type === 'tau' || p.type === 'bquark')
        ? Math.min(300, 120 + p.pt * 0.4)
        : 0;
      return { p, color, sel, dash, pts, ptsNeg, jetR, style };
    });
  }, [event, getFiltered, selectedIds]);

  const handleClick = (p: Particle) => {
    toggleParticleSelection(p.id);
    if (selectedIds.size === 1) {
      const first = [...selectedIds][0];
      if (first !== p.id && event) {
        const all = getFiltered(event);
        const p1 = all.find(x => x.id === first);
        if (p1) addPair(p1, p);
      }
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col rounded-md border border-[#2A3352] bg-[#050810] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1E2742]">
        <div className="font-mono text-[10.5px] uppercase tracking-wider text-fuchsia-300">
          纵截面 RZ View
        </div>
        <div className="flex gap-1 text-[10px] text-slate-400 font-mono">
          <button
            onClick={() => setView({ zoom: view.zoom * 1.25, tx: view.tx, ty: view.ty })}
            className="px-1.5 py-0.5 hover:bg-[#1A2340] rounded"
          >+</button>
          <button
            onClick={() => setView({ zoom: Math.max(0.4, view.zoom / 1.25), tx: view.tx, ty: view.ty })}
            className="px-1.5 py-0.5 hover:bg-[#1A2340] rounded"
          >−</button>
          <button
            onClick={() => setView({ zoom: 1, tx: 0, ty: 0 })}
            className="px-1.5 py-0.5 hover:bg-[#1A2340] rounded"
          >⟲</button>
        </div>
      </div>
      <div className="relative flex-1">
        <svg ref={svgRef} viewBox={viewBox} preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
          <defs>
            <linearGradient id="rz-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0B1228" />
              <stop offset="50%" stopColor="#060A1A" />
              <stop offset="100%" stopColor="#0B1228" />
            </linearGradient>
          </defs>
          <rect x={-HALF_Z} y={-MAX_R} width={HALF_Z * 2} height={MAX_R * 2} fill="url(#rz-bg)" />
          <g transform="scale(1 -1)">
            {heatmap}
            {detector}
            {particles.map(({ p, color, sel, dash, pts, ptsNeg, jetR, style }) => {
              if (p.type === 'jet' || p.type === 'tau' || p.type === 'bquark') {
                const last = p.trackPoints[p.trackPoints.length - 1];
                if (!last) return null;
                const ez = last.z * 0.55;
                const er = Math.sqrt(last.x * last.x + last.y * last.y) * 0.55;
                return (
                  <g key={`l-j-${p.id}`} onClick={() => handleClick(p)}
                    onMouseEnter={() => setHover(p)} onMouseLeave={() => setHover(null)}
                    style={{ cursor: 'pointer' }}>
                    <ellipse cx={ez} cy={er} rx={jetR * 1.4} ry={jetR * 0.6}
                      fill={color} opacity={sel ? 0.32 : 0.12}
                      stroke={color} strokeWidth={sel ? selWidth(2.5) : selWidth(1)} strokeDasharray="4 3" />
                    <ellipse cx={ez} cy={-er} rx={jetR * 1.4} ry={jetR * 0.6}
                      fill={color} opacity={sel ? 0.2 : 0.06}
                      stroke={color} strokeWidth={sel ? selWidth(1.5) : selWidth(0.7)} strokeDasharray="4 3" />
                  </g>
                );
              }
              if (style === 'none') return null;
              return (
                <g key={`l-p-${p.id}`} onClick={() => handleClick(p)}
                  onMouseEnter={() => setHover(p)} onMouseLeave={() => setHover(null)}
                  style={{ cursor: 'pointer' }}>
                  <polyline points={pts} fill="none" stroke={color}
                    strokeWidth={sel ? selWidth(2.8) : selWidth(1.4)}
                    strokeOpacity={sel ? 1 : 0.85} strokeDasharray={dash} />
                  <polyline points={ptsNeg} fill="none" stroke={color}
                    strokeWidth={sel ? selWidth(1.8) : selWidth(0.9)}
                    strokeOpacity={sel ? 0.5 : 0.35} strokeDasharray={dash} />
                </g>
              );
            })}
            <line x1={-HALF_Z} y1={0} x2={HALF_Z} y2={0} stroke="#2A3352" strokeWidth={selWidth(0.6)} />
            <line x1={0} y1={-MAX_R} x2={0} y2={MAX_R} stroke="#2A3352" strokeWidth={selWidth(0.6)} />
          </g>
        </svg>
        <div className="pointer-events-none absolute left-2 top-2 font-mono text-[9.5px] text-slate-400 space-y-0.5">
          <div><span className="text-emerald-400">→</span> +Z 束流</div>
          <div><span className="text-amber-400">↑</span> +R⊥</div>
        </div>
        <div className="pointer-events-none absolute right-2 bottom-1 font-mono text-[9px] text-slate-500">
          Z ∈ [{-Math.round(HALF_Z)}, {Math.round(HALF_Z)} mm]
        </div>
        {hover && (
          <div className="pointer-events-none absolute left-2 bottom-2 font-mono text-[10.5px] bg-black/85 px-2 py-1 rounded border border-fuchsia-500/30 text-white">
            #{hover.id} <span className="text-fuchsia-300">{hover.type.toUpperCase()}</span> ·
            E {hover.energy.toFixed(1)} GeV · η {hover.eta.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  );
};

export default LongitudinalSection;
