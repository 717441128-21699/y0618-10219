import React from 'react';
import { Filter, RotateCcw, Zap, Eye, EyeOff } from 'lucide-react';
import { useFilterStore } from '@/store/filterStore';
import { ParticleType } from '@/types/physics';
import { PARTICLE_COLORS, PARTICLE_NAMES } from '@/utils/colors';

const ALL_TYPES: ParticleType[] = [
  ParticleType.ELECTRON,
  ParticleType.MUON,
  ParticleType.PHOTON,
  ParticleType.JET,
  ParticleType.TAU,
  ParticleType.BQUARK,
];

const FilterControls: React.FC = () => {
  const ptThreshold = useFilterStore(s => s.ptThreshold);
  const etaRange = useFilterStore(s => s.etaRange);
  const energyRange = useFilterStore(s => s.energyRange);
  const visibleParticleTypes = useFilterStore(s => s.visibleParticleTypes);
  const showOnlySignal = useFilterStore(s => s.showOnlySignal);
  const showCharge = useFilterStore(s => s.showCharge);
  const minTrackPoints = useFilterStore(s => s.minTrackPoints);
  const setPtThreshold = useFilterStore(s => s.setPtThreshold);
  const setEtaRange = useFilterStore(s => s.setEtaRange);
  const setEnergyRange = useFilterStore(s => s.setEnergyRange);
  const toggleParticleType = useFilterStore(s => s.toggleParticleType);
  const setAllParticleTypes = useFilterStore(s => s.setAllParticleTypes);
  const setShowOnlySignal = useFilterStore(s => s.setShowOnlySignal);
  const setShowCharge = useFilterStore(s => s.setShowCharge);
  const setMinTrackPoints = useFilterStore(s => s.setMinTrackPoints);
  const resetFilters = useFilterStore(s => s.resetFilters);

  const allVisible = ALL_TYPES.every(t => visibleParticleTypes.has(t));

  return (
    <div className="space-y-3 rounded-md border border-[#2A3352] bg-[#0D1528] p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-slate-300">
          <Filter className="h-3.5 w-3.5 text-cyan-400" />
          过滤器
        </div>
        <button
          onClick={resetFilters}
          className="flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-cyan-300 transition-colors"
          title="重置过滤器"
        >
          <RotateCcw className="h-3 w-3" />
          重置
        </button>
      </div>

      <div className="space-y-2">
        <div>
          <div className="flex items-center justify-between text-[10.5px] font-mono">
            <span className="text-slate-400">横动量 pT 阈值</span>
            <span className="text-amber-300">{ptThreshold.toFixed(1)} GeV/c</span>
          </div>
          <input
            type="range"
            min={0}
            max={200}
            step={0.5}
            value={ptThreshold}
            onChange={e => setPtThreshold(parseFloat(e.target.value))}
            className="mt-1 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#1E2742] accent-amber-500"
          />
          <div className="mt-0.5 flex justify-between font-mono text-[8.5px] text-slate-600">
            <span>0</span>
            <span>50</span>
            <span>100</span>
            <span>200 GeV/c</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-[10.5px] font-mono">
            <span className="text-slate-400">赝快度 η 范围</span>
            <span className="text-cyan-300">[{etaRange[0].toFixed(1)}, {etaRange[1].toFixed(1)}]</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="range"
              min={-5}
              max={0}
              step={0.1}
              value={etaRange[0]}
              onChange={e => setEtaRange([parseFloat(e.target.value), etaRange[1]])}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[#1E2742] accent-cyan-500"
            />
            <input
              type="range"
              min={0}
              max={5}
              step={0.1}
              value={etaRange[1]}
              onChange={e => setEtaRange([etaRange[0], parseFloat(e.target.value)])}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[#1E2742] accent-cyan-500"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-[10.5px] font-mono">
            <span className="text-slate-400">能量 E 范围</span>
            <span className="text-emerald-300">
              [{energyRange[0].toFixed(0)}, {energyRange[1].toFixed(0)}] GeV
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="range"
              min={0}
              max={1000}
              step={10}
              value={energyRange[0]}
              onChange={e => setEnergyRange([parseFloat(e.target.value), energyRange[1]])}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[#1E2742] accent-emerald-500"
            />
            <input
              type="range"
              min={500}
              max={10000}
              step={50}
              value={energyRange[1]}
              onChange={e => setEnergyRange([energyRange[0], parseFloat(e.target.value)])}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[#1E2742] accent-emerald-500"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-[10.5px] font-mono">
            <span className="text-slate-400">最小径迹点</span>
            <span className="text-rose-300">{minTrackPoints}</span>
          </div>
          <input
            type="range"
            min={0}
            max={20}
            step={1}
            value={minTrackPoints}
            onChange={e => setMinTrackPoints(parseInt(e.target.value))}
            className="mt-1 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#1E2742] accent-rose-500"
          />
        </div>
      </div>

      <div className="space-y-2 border-t border-[#1E2742] pt-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-mono text-slate-300">粒子类型可见性</span>
          <button
            onClick={() => setAllParticleTypes(!allVisible)}
            className="flex items-center gap-1 text-[9.5px] font-mono text-slate-500 hover:text-slate-300 transition-colors"
          >
            {allVisible ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
            {allVisible ? '全部隐藏' : '全部显示'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {ALL_TYPES.map(type => {
            const vis = visibleParticleTypes.has(type);
            return (
              <button
                key={type}
                onClick={() => toggleParticleType(type)}
                className={`flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] font-mono transition-all ${
                  vis
                    ? 'border-opacity-80 bg-opacity-15'
                    : 'border-[#1E2742] bg-transparent opacity-40 hover:opacity-70'
                }`}
                style={vis ? {
                  borderColor: PARTICLE_COLORS[type] + '99',
                  backgroundColor: PARTICLE_COLORS[type] + '22',
                  color: PARTICLE_COLORS[type],
                } : { color: '#94A3B8' }}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full border border-white/20"
                  style={{ backgroundColor: PARTICLE_COLORS[type] }}
                />
                {PARTICLE_NAMES[type]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 border-t border-[#1E2742] pt-2.5">
        <label className="flex cursor-pointer items-center gap-2 text-[10.5px] font-mono text-slate-300">
          <input
            type="checkbox"
            checked={showOnlySignal}
            onChange={e => setShowOnlySignal(e.target.checked)}
            className="h-3 w-3 accent-cyan-500"
          />
          <Zap className="h-3 w-3 text-amber-400" />
          仅显示信号粒子
        </label>

        <div>
          <div className="text-[10.5px] font-mono text-slate-400 mb-1">电荷筛选</div>
          <div className="grid grid-cols-4 gap-1">
            {(['all', 'positive', 'negative', 'neutral'] as const).map(ch => (
              <button
                key={ch}
                onClick={() => setShowCharge(ch)}
                className={`rounded border px-1 py-1 text-[9.5px] font-mono transition-colors ${
                  showCharge === ch
                    ? 'border-fuchsia-500/60 bg-fuchsia-500/15 text-fuchsia-300'
                    : 'border-[#1E2742] bg-[#070B18] text-slate-400 hover:text-slate-200'
                }`}
              >
                {ch === 'all' ? '全部' : ch === 'positive' ? '+' : ch === 'negative' ? '−' : '0'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterControls;
