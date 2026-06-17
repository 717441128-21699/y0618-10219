import React, { useMemo, useRef, useState } from 'react';
import type { Particle, PhysicsEvent } from '@/types/physics';
import { PARTICLE_COLORS, PARTICLE_LINE_STYLES, viridisColor, logNormalize } from '@/utils/colors';
import { useEventStore } from '@/store/eventStore';
import { useFilterStore } from '@/store/filterStore';
import { useViewStore } from '@/store/viewStore';
import { useAnalysisStore } from '@/store/analysisStore';
import { USED_DETECTOR } from '@/services/physics/detectorGeometry';

const CROSS_RADIUS = USED_DETECTOR.muonChamber.outerRadius * 1.02;

interface CrossSectionProps {
  width?: number;
  height?: number;
}

const CrossSection: React.FC<CrossSectionProps> = ({ width = 400, height = 400 }) => {
  const event = useEventStore(s => s.currentEvent) as PhysicsEvent | null;
  const getFiltered = useFilterStore(s => s.getFilteredParticles);
  const showDetector = useViewStore(s => s.showDetectorGeometry);
  const showHeatmap = useViewStore(s => s.showEnergyHeatmap);
  const heatmapOpacity = useViewStore(s => s.heatmapOpacity);
  const selectedIds = useViewStore(s => s.selectedParticleIds);
  const toggleParticleSelection = useViewStore(s => s.toggleParticleSelection);
  const addPair = useAnalysisStore(s => s.addPair);
  const showMET = useViewStore(s => s.showMissingET);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<Particle | null>(null);
  const [view, setView] = useState({ zoom: 1, tx: 0, ty: 0 });

  const viewBox = useMemo(() => {
    const range = CROSS_RADIUS / view.zoom;
    return `${-range + view.tx} ${-range + view.ty} ${range * 2} ${range * 2}`;
  }, [view]);

  const detectorLayers = useMemo(() => {
    if (!showDetector) return null;
    const d = USED_DETECTOR;
    return (
      <g opacity={0.35}>
        <circle cx={0} cy={0} r={d.beamPipe.radius} fill="none" stroke="#00FF88" strokeWidth={1.2} />
        {Array.from({ length: d.pixel.layers }, (_, i) => {
          const r = d.pixel.innerRadius + i * (d.pixel.outerRadius - d.pixel.innerRadius) / (d.pixel.layers - 1 || 1);
          return <circle key={`px-${i}`} cx={0} cy={0} r={r} fill="none" stroke="#4A6FA5" strokeWidth={0.6} />;
        })}
        {Array.from({ length: d.sct.layers }, (_, i) => {
          const r = d.sct.innerRadius + i * (d.sct.outerRadius - d.sct.innerRadius) / (d.sct.layers - 1 || 1);
          return <circle key={`sct-${i}`} cx={0} cy={0} r={r} fill="none" stroke="#5C821A" strokeWidth={0.6} />;
        })}
        <circle cx={0} cy={0} r={d.trt.outerRadius} fill="none" stroke="#C46352" strokeWidth={0.6} strokeDasharray="2 4" />
        <circle cx={0} cy={0} r={d.emCalo.outerRadius} fill="#9B5DE512" stroke="#9B5DE5" strokeWidth={0.7} />
        <circle cx={0} cy={0} r={d.hadCalo.outerRadius} fill="#F15BB510" stroke="#F15BB5" strokeWidth={0.7} />
        <circle cx={0} cy={0} r={d.muonChamber.innerRadius} fill="none" stroke="#00BBF9" strokeWidth={0.7} strokeDasharray="4 3" />
        <circle cx={0} cy={0} r={d.muonChamber.outerRadius} fill="none" stroke="#00BBF9" strokeWidth={0.8} strokeDasharray="4 3" />
      </g>
    );
  }, [showDetector]);

  const heatmap = useMemo(() => {
    if (!showHeatmap || !event) return null;
    const NBINS = 60;
    const MAX_R = USED_DETECTOR.emCalo.outerRadius + 60;
    const NBINS_PHI = 96;
    const data = new Float32Array(NBINS * NBINS_PHI);
    let max = 0;
    for (const d of event.energyDeposits) {
      if (Math.abs(d.eta) > 1.37) continue;
      const rBin = Math.min(NBINS - 1, Math.floor(USED_DETECTOR.emCalo.innerRadius / MAX_R * NBINS + Math.random() * 0.3));
      let phi = d.phi;
      while (phi < 0) phi += 2 * Math.PI;
      while (phi >= 2 * Math.PI) phi -= 2 * Math.PI;
      const pBin = Math.min(NBINS_PHI - 1, Math.floor((phi / (2 * Math.PI)) * NBINS_PHI));
      const idx = rBin * NBINS_PHI + pBin;
      const radialSpread = Math.min(1.3 - Math.abs(d.eta), 0.6) * 0.0 + 0.8;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dp = -1; dp <= 1; dp++) {
          const rr = Math.min(NBINS - 1, Math.max(0, rBin + dr));
          const pp = (pBin + dp + NBINS_PHI) % NBINS_PHI;
          const ii = rr * NBINS_PHI + pp;
          data[ii] += d.energy * radialSpread * (dr === 0 && dp === 0 ? 1 : 0.4);
          max = Math.max(max, data[ii]);
        }
      }
      void idx;
    }
    const elems: JSX.Element[] = [];
    for (let i = 0; i < NBINS; i++) {
      const r0 = (i / NBINS) * MAX_R;
      const r1 = ((i + 1) / NBINS) * MAX_R;
      for (let j = 0; j < NBINS_PHI; j++) {
        const a0 = (j / NBINS_PHI) * 2 * Math.PI - Math.PI / 2;
        const a1 = ((j + 1) / NBINS_PHI) * 2 * Math.PI - Math.PI / 2;
        const v = data[i * NBINS_PHI + j];
        const t = logNormalize(v, max);
        if (t < 0.04) continue;
        const color = viridisColor(t);
        const x0_0 = r0 * Math.cos(a0), y0_0 = r0 * Math.sin(a0);
        const x1_0 = r1 * Math.cos(a0), y1_0 = r1 * Math.sin(a0);
        const x0_1 = r0 * Math.cos(a1), y0_1 = r0 * Math.sin(a1);
        const x1_1 = r1 * Math.cos(a1), y1_1 = r1 * Math.sin(a1);
        elems.push(
          <path
            key={`hm-${i}-${j}`}
            d={`M ${x0_0} ${y0_0} L ${x1_0} ${y1_0} A ${r1} ${r1} 0 0 1 ${x1_1} ${y1_1} L ${x0_1} ${y0_1} A ${r0} ${r0} 0 0 0 ${x0_0} ${y0_0} Z`}
            fill={color}
            opacity={t * heatmapOpacity}
          />
        );
      }
    }
    return <g opacity={1}>{elems}</g>;
  }, [showHeatmap, event, heatmapOpacity]);

  const particles = useMemo(() => {
    if (!event) return [];
    const filtered = getFiltered(event);
    return filtered.map(p => {
      const color = PARTICLE_COLORS[p.type as keyof typeof PARTICLE_COLORS];
      const style = PARTICLE_LINE_STYLES[p.type as keyof typeof PARTICLE_LINE_STYLES];
      const sel = selectedIds.has(p.id);
      const dash = style === 'dashed' ? '12 8' : style === 'dotted' ? '2 5' : undefined;
      const pts = p.trackPoints.map(tp => `${tp.x.toFixed(1)},${tp.y.toFixed(1)}`).join(' ');
      const jetR = (p.type === 'jet' || p.type === 'tau' || p.type === 'bquark')
        ? Math.min(350, 120 + p.pt * 0.5)
        : 0;
      return { p, color, style, sel, dash, pts, jetR };
    });
  }, [event, getFiltered, selectedIds]);

  const handleClick = (p: Particle) => {
    toggleParticleSelection(p.id);
    if (selectedIds.size === 1) {
      const first = [...selectedIds][0];
      if (first !== p.id && event) {
        const all = getFiltered(event);
        const p1 = all.find(x => x.id === first);
        if (p1) addPair(p1, p, event.eventId);
      }
    }
  };

  const meet = useMemo(() => {
    if (!showMET || !event) return null;
    const len = Math.min(CROSS_RADIUS * 0.75, 60 + event.missingET.et * 12);
    const x = len * Math.cos(event.missingET.phi);
    const y = len * Math.sin(event.missingET.phi);
    return (
      <g>
        <line x1={0} y1={0} x2={x} y2={y} stroke="#FF1744" strokeWidth={selWidth(2.5)} />
        <polygon
          points={`${x},${y} ${x - 18 * Math.cos(event.missingET.phi - 0.4)},${y - 18 * Math.sin(event.missingET.phi - 0.4)} ${x - 18 * Math.cos(event.missingET.phi + 0.4)},${y - 18 * Math.sin(event.missingET.phi + 0.4)}`}
          fill="#FF1744"
        />
      </g>
    );
  }, [event, showMET]);

  function selWidth(n: number) { return n * (1 / Math.max(0.2, view.zoom)); }

  return (
    <div className="relative flex h-full w-full flex-col rounded-md border border-[#2A3352] bg-[#050810] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1E2742]">
        <div className="font-mono text-[10.5px] uppercase tracking-wider text-cyan-300">
          横截面 XY View
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
        <svg
          ref={svgRef}
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          width="100%"
          height="100%"
          data-export-scope="all-views"
        >
          <defs>
            <radialGradient id="cross-bg">
              <stop offset="0%" stopColor="#081028" />
              <stop offset="100%" stopColor="#050810" />
            </radialGradient>
          </defs>
          <rect x={-CROSS_RADIUS} y={-CROSS_RADIUS} width={CROSS_RADIUS * 2} height={CROSS_RADIUS * 2} fill="url(#cross-bg)" />
          <g transform="scale(1 -1)">
            {heatmap}
            {detectorLayers}
            {particles.map(({ p, color, style, sel, dash, pts, jetR }) => {
              if (p.type === 'jet' || p.type === 'tau' || p.type === 'bquark') {
                const vx = p.trackPoints[0]?.x ?? p.vertex.x;
                const vy = p.trackPoints[0]?.y ?? p.vertex.y;
                const ex = (p.trackPoints[p.trackPoints.length - 1]?.x ?? vx) * 0.55;
                const ey = (p.trackPoints[p.trackPoints.length - 1]?.y ?? vy) * 0.55;
                return (
                  <g key={`c-jet-${p.id}`}
                    onClick={() => handleClick(p)}
                    onMouseEnter={() => setHover(p)}
                    onMouseLeave={() => setHover(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle cx={ex} cy={ey} r={jetR}
                      fill={color}
                      opacity={sel ? 0.3 : 0.12}
                      stroke={color}
                      strokeWidth={sel ? selWidth(2.5) : selWidth(1)}
                      strokeDasharray="4 3"
                    />
                    <line x1={vx} y1={vy} x2={ex} y2={ey} stroke={color} strokeWidth={selWidth(2)} opacity={0.5} />
                  </g>
                );
              }
              if (style === 'none') return null;
              return (
                <polyline
                  key={`c-pl-${p.id}`}
                  points={pts}
                  fill="none"
                  stroke={color}
                  strokeWidth={sel ? selWidth(2.8) : selWidth(1.4)}
                  strokeOpacity={sel ? 1 : 0.88}
                  strokeDasharray={dash}
                  onClick={() => handleClick(p)}
                  onMouseEnter={() => setHover(p)}
                  onMouseLeave={() => setHover(null)}
                  style={{ cursor: 'pointer' }}
                />
              );
            })}
            {meet}
            <line x1={-CROSS_RADIUS} y1={0} x2={CROSS_RADIUS} y2={0} stroke="#2A3352" strokeWidth={selWidth(0.6)} />
            <line x1={0} y1={-CROSS_RADIUS} x2={0} y2={CROSS_RADIUS} stroke="#2A3352" strokeWidth={selWidth(0.6)} />
          </g>
        </svg>
        <div className="pointer-events-none absolute left-2 top-2 font-mono text-[9.5px] text-slate-400 space-y-0.5">
          <div><span className="text-rose-400">→</span> +X</div>
          <div><span className="text-cyan-400">↑</span> +Y</div>
        </div>
        <div className="pointer-events-none absolute right-2 bottom-1 font-mono text-[9px] text-slate-500">
          R ∈ [0, {Math.round(CROSS_RADIUS)} mm]
        </div>
        {hover && (
          <div className="pointer-events-none absolute left-2 bottom-2 font-mono text-[10.5px] bg-black/85 px-2 py-1 rounded border border-cyan-500/30 text-white">
            #{hover.id} <span className="text-cyan-300">{hover.type.toUpperCase()}</span> ·
            pT {hover.pt.toFixed(1)} · η {hover.eta.toFixed(2)} · φ {hover.phi.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  );
};

export default CrossSection;
