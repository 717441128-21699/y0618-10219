import React, { useMemo, useState } from 'react';
import {
  Table, ChevronDown, ChevronUp, X, Link2, Trash2, Atom,
} from 'lucide-react';
import { useEventStore } from '@/store/eventStore';
import { useFilterStore } from '@/store/filterStore';
import { useViewStore } from '@/store/viewStore';
import { useAnalysisStore } from '@/store/analysisStore';
import type { Particle } from '@/types/physics';
import { ParticleType } from '@/types/physics';
import { PARTICLE_COLORS, PARTICLE_SYMBOLS, PARTICLE_NAMES } from '@/utils/colors';
import { formatEnergy, formatMass } from '@/utils/format';

type SortKey = 'id' | 'type' | 'pt' | 'eta' | 'phi' | 'energy' | 'charge';

const ParticleTable: React.FC = () => {
  const event = useEventStore(s => s.currentEvent);
  const getFiltered = useFilterStore(s => s.getFilteredParticles);
  const selectedIds = useViewStore(s => s.selectedParticleIds);
  const toggleParticleSelection = useViewStore(s => s.toggleParticleSelection);
  const clearSelection = useViewStore(s => s.clearSelection);
  const addPair = useAnalysisStore(s => s.addPair);
  const removePair = useAnalysisStore(s => s.removePair);
  const selectedPairs = useAnalysisStore(s => s.selectedPairs);
  const buildHistogram = useAnalysisStore(s => s.buildHistogram);

  const [sortKey, setSortKey] = useState<SortKey>('pt');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterType, setFilterType] = useState<ParticleType | 'all'>('all');

  const filteredParticles = useMemo(() => {
    if (!event) return [];
    const parts = getFiltered(event);
    const f = filterType === 'all' ? parts : parts.filter(p => p.type === filterType);
    return f.sort((a, b) => {
      let va: any = a[sortKey];
      let vb: any = b[sortKey];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [event, getFiltered, sortKey, sortAsc, filterType]);

  const handleSort = (k: SortKey) => {
    if (k === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(k);
      setSortAsc(false);
    }
  };

  const handleParticleClick = (p: Particle, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      toggleParticleSelection(p.id);
    } else {
      clearSelection();
      toggleParticleSelection(p.id);
      if (selectedIds.size === 1) {
        const first = [...selectedIds][0];
        if (first !== p.id && event) {
          const all = getFiltered(event);
          const p1 = all.find(x => x.id === first);
          if (p1) {
            addPair(p1, p, event.eventId);
            buildHistogram('mass');
          }
        }
      }
    }
  };

  const SortHeader = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => handleSort(k)}
      className="flex w-full items-center gap-0.5 font-mono hover:text-white transition-colors"
    >
      {label}
      {sortKey === k && (
        sortAsc ? <ChevronUp className="h-2.5 w-2.5 text-cyan-300" /> : <ChevronDown className="h-2.5 w-2.5 text-cyan-300" />
      )}
    </button>
  );

  if (!event) {
    return (
      <div className="rounded-md border border-[#2A3352] bg-[#0D1528] p-4">
        <div className="text-center font-mono text-xs text-slate-500">
          <Atom className="mx-auto mb-2 h-8 w-8 opacity-40" />
          加载事件数据以查看粒子列表
        </div>
      </div>
    );
  }

  const particleTypesInEvent = Array.from(new Set(event.particles.map(p => p.type)));

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden">
      <div className="space-y-3 rounded-md border border-[#2A3352] bg-[#0D1528] p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-slate-300">
            <Table className="h-3.5 w-3.5 text-amber-400" />
            粒子列表
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <button
                onClick={clearSelection}
                className="flex items-center gap-1 rounded bg-rose-500/15 px-1.5 py-0.5 text-[9.5px] font-mono text-rose-300 hover:bg-rose-500/25 transition-colors"
              >
                <X className="h-2.5 w-2.5" /> 清空选中 ({selectedIds.size})
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setFilterType('all')}
            className={`rounded border px-1.5 py-0.5 text-[9.5px] font-mono transition-colors ${
              filterType === 'all'
                ? 'border-white/40 bg-white/10 text-white'
                : 'border-[#1E2742] bg-[#070B18] text-slate-500 hover:text-slate-200'
            }`}
          >
            全部 {filteredParticles.length !== event.particles.length && `(${getFiltered(event).length})`}
          </button>
          {particleTypesInEvent.map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9.5px] font-mono transition-colors ${
                filterType === t
                  ? 'text-white'
                  : 'border-[#1E2742] bg-[#070B18] text-slate-500 hover:text-slate-200'
              }`}
              style={filterType === t ? {
                borderColor: PARTICLE_COLORS[t] + '99',
                backgroundColor: PARTICLE_COLORS[t] + '22',
                color: PARTICLE_COLORS[t],
              } : {}}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PARTICLE_COLORS[t] }} />
              {PARTICLE_SYMBOLS[t]} {event.particles.filter(p => p.type === t).length}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-md border border-[#2A3352] bg-[#070B18] text-[10.5px] font-mono">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-[#0A1022] text-slate-400">
            <tr>
              <th className="w-6 px-1.5 py-1.5 text-left">#</th>
              <th className="px-1.5 py-1.5 text-left"><SortHeader k="type" label="类型" /></th>
              <th className="px-1.5 py-1.5 text-right"><SortHeader k="pt" label="pT" /></th>
              <th className="px-1.5 py-1.5 text-right"><SortHeader k="eta" label="η" /></th>
              <th className="px-1.5 py-1.5 text-right"><SortHeader k="phi" label="φ" /></th>
              <th className="px-1.5 py-1.5 text-right"><SortHeader k="energy" label="E" /></th>
              <th className="px-1.5 py-1.5 text-right"><SortHeader k="charge" label="Q" /></th>
            </tr>
          </thead>
          <tbody>
            {filteredParticles.map((p, i) => {
              const selected = selectedIds.has(p.id);
              return (
                <tr
                  key={p.id}
                  onClick={(e) => handleParticleClick(p, e)}
                  className={`cursor-pointer border-b border-[#11182E] transition-colors ${
                    selected ? 'bg-cyan-500/15 text-cyan-100' : 'text-slate-200 hover:bg-[#111A32]'
                  } ${i % 2 ? 'bg-[#091020]/40' : ''}`}
                >
                  <td className="px-1.5 py-1 text-slate-500">{p.id}</td>
                  <td className="px-1.5 py-1">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PARTICLE_COLORS[p.type] }} />
                      <span style={{ color: PARTICLE_COLORS[p.type] }}>{PARTICLE_SYMBOLS[p.type]}</span>
                      {p.isSignal && <span className="text-amber-400 text-[8px]">★</span>}
                    </span>
                  </td>
                  <td className="px-1.5 py-1 text-right tabular-nums">{p.pt.toFixed(1)}</td>
                  <td className="px-1.5 py-1 text-right tabular-nums">{p.eta.toFixed(2)}</td>
                  <td className="px-1.5 py-1 text-right tabular-nums">{p.phi.toFixed(2)}</td>
                  <td className="px-1.5 py-1 text-right tabular-nums">{p.energy.toFixed(1)}</td>
                  <td className="px-1.5 py-1 text-right tabular-nums">
                    {p.charge > 0 ? '+' : p.charge < 0 ? '−' : '0'}
                  </td>
                </tr>
              );
            })}
            {filteredParticles.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                  无可见粒子，尝试降低过滤阈值
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedPairs.length > 0 && (
        <div className="space-y-2 rounded-md border border-fuchsia-500/30 bg-[#0D1528] p-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-fuchsia-300">
              <Link2 className="h-3 w-3" />
              不变质量对 ({selectedPairs.length})
            </div>
            <button
              onClick={() => { useAnalysisStore.getState().clearPairs(); }}
              className="text-[9.5px] text-slate-500 hover:text-rose-300 font-mono"
            >
              全部清除
            </button>
          </div>
          <div className="max-h-32 space-y-1 overflow-auto">
            {selectedPairs.map((pair, idx) => (
              <div key={pair.id} className="flex items-center justify-between rounded border border-[#1E2742] bg-[#070B18] px-1.5 py-1">
                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                  <span className="text-cyan-300">#{pair.particle1.id}</span>
                  <span style={{ color: PARTICLE_COLORS[pair.particle1.type] }}>{PARTICLE_SYMBOLS[pair.particle1.type]}</span>
                  <span className="text-slate-500">×</span>
                  <span className="text-cyan-300">#{pair.particle2.id}</span>
                  <span style={{ color: PARTICLE_COLORS[pair.particle2.type] }}>{PARTICLE_SYMBOLS[pair.particle2.type]}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="text-amber-300">
                    {formatMass(pair.invariantMass)}
                  </span>
                  <span className="text-slate-500">
                    ΔR={pair.deltaR.toFixed(2)}
                  </span>
                  <button
                    onClick={() => removePair(idx)}
                    className="text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticleTable;
