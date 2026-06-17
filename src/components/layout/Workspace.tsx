import React, { useEffect, useState, useRef } from 'react';
import TopBar from './TopBar';
import EventNavigator from '@/components/controls/EventNavigator';
import FilterControls from '@/components/controls/FilterControls';
import ViewOptions from '@/components/controls/ViewOptions';
import ParticleTable from '@/components/info/ParticleTable';
import View3D from '@/components/views/View3D/View3D';
import CrossSection from '@/components/views/CrossSection';
import LongitudinalSection from '@/components/views/LongitudinalSection';
import HistogramChart from '@/components/views/HistogramChart';
import ImportDialog from '@/components/dialogs/ImportDialog';
import ExportDialog from '@/components/dialogs/ExportDialog';
import { SplitPane, CollapsiblePanel } from './SplitPane';
import { useEventStore } from '@/store/eventStore';
import { useViewStore } from '@/store/viewStore';
import { useAnalysisStore } from '@/store/analysisStore';
import { useFilterStore } from '@/store/filterStore';
import { PARTICLE_COLORS, PARTICLE_NAMES, PARTICLE_SYMBOLS } from '@/utils/colors';
import { ParticleType } from '@/types/physics';
import {
  ChevronDown, ChevronUp, BarChart3, Info, Cpu, Atom,
} from 'lucide-react';

const Workspace: React.FC = () => {
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const leftCollapsed = useViewStore(s => s.leftPanelCollapsed);
  const rightCollapsed = useViewStore(s => s.rightPanelCollapsed);
  const bottomCollapsed = useViewStore(s => s.bottomPanelCollapsed);
  const leftPanelWidth = useViewStore(s => s.leftPanelWidth);
  const rightPanelWidth = useViewStore(s => s.rightPanelWidth);
  const bottomPanelHeight = useViewStore(s => s.bottomPanelHeight);
  const togglePanel = useViewStore(s => s.togglePanel);
  const setPanelSize = useViewStore(s => s.setPanelSize);

  const loadMock = useEventStore(s => s.loadMockData);
  const totalEvents = useEventStore(s => s.totalEvents);
  const histogram = useAnalysisStore(s => s.massHistogram);
  const activeType = useAnalysisStore(s => s.activeHistogramType);
  const setActiveType = useAnalysisStore(s => s.setActiveHistogramType);
  const buildHistogram = useAnalysisStore(s => s.buildHistogram);
  const event = useEventStore(s => s.currentEvent);
  const getFiltered = useFilterStore(s => s.getFilteredParticles);

  useEffect(() => {
    if (totalEvents === 0) {
      setImportOpen(true);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const es = useEventStore.getState();
      if (e.key === 'ArrowRight' && !e.shiftKey) es.nextEvent();
      if (e.key === 'ArrowLeft' && !e.shiftKey) es.prevEvent();
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!es.isLastEvent) es.nextEvent();
      }
      if (e.key === 'f' || e.key === 'F') togglePanel('left');
      if (e.key === 'i' || e.key === 'I') togglePanel('right');
      if (e.key === 'a' || e.key === 'A') togglePanel('bottom');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleHistTypeChange = (type: 'mass' | 'pt' | 'eta' | 'energy') => {
    setActiveType(type);
    if (event) {
      const parts = getFiltered(event);
      buildHistogram(type, 60, undefined, undefined, parts);
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-[#050810] text-slate-200 select-none">
      <TopBar
        onOpenImport={() => setImportOpen(true)}
        onOpenExport={() => setExportOpen(true)}
        onToggleLeftPanel={() => togglePanel('left')}
        onToggleRightPanel={() => togglePanel('right')}
        onToggleBottomPanel={() => togglePanel('bottom')}
      />

      <div className="flex flex-1 min-h-0 flex-col">
        <SplitPane
          direction="horizontal"
          initialSize={leftPanelWidth}
          minSize={240}
          maxSize={520}
          collapsed={leftCollapsed}
          firstPane={
            <CollapsiblePanel
              collapsed={leftCollapsed}
              direction="left"
              toggle={() => togglePanel('left')}
              className="border-r border-[#1E2742] bg-[#080E20]"
            >
              <div className="space-y-3 p-3">
                <EventNavigator />
                <FilterControls />
                <ViewOptions />
                <div className="rounded-md border border-[#2A3352] bg-[#0D1528] p-3">
                  <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-slate-300 mb-2">
                    <Atom className="h-3.5 w-3.5 text-fuchsia-400" />
                    粒子类型图例
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {(['electron', 'muon', 'photon', 'jet', 'tau', 'bquark'] as ParticleType[]).map(t => (
                      <div key={t} className="flex items-center gap-2 px-1 py-0.5 rounded bg-[#070B18]">
                        <span
                          className="inline-block h-3 w-8 rounded-sm"
                          style={{
                            backgroundColor: PARTICLE_COLORS[t] + '40',
                            border: `1px solid ${PARTICLE_COLORS[t]}`,
                          }}
                        />
                        <span className="font-mono text-[10px] font-bold" style={{ color: PARTICLE_COLORS[t] }}>
                          {PARTICLE_SYMBOLS[t]}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {PARTICLE_NAMES[t]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-md border border-[#2A3352] bg-[#0D1528] p-3">
                  <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-slate-300 mb-2">
                    <Info className="h-3.5 w-3.5 text-sky-400" />
                    快捷键
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[9.5px] text-slate-500">
                    <div><kbd className="text-slate-300">←</kbd> 上一事件</div>
                    <div><kbd className="text-slate-300">→</kbd> 下一事件</div>
                    <div><kbd className="text-slate-300">F</kbd> 过滤面板</div>
                    <div><kbd className="text-slate-300">I</kbd> 信息面板</div>
                    <div><kbd className="text-slate-300">A</kbd> 分析面板</div>
                    <div><kbd className="text-slate-300">空格</kbd> 下一个</div>
                  </div>
                </div>
              </div>
            </CollapsiblePanel>
          }
          secondPane={
            <SplitPane
              direction="horizontal"
              initialSize={rightPanelWidth}
              minSize={260}
              maxSize={640}
              collapsed={rightCollapsed}
              firstPane={
                <div className="flex flex-col h-full min-h-0">
                  <div className="flex-1 min-h-0">
                    <SplitPane
                      direction="vertical"
                      initialSize={bottomPanelHeight}
                      minSize={180}
                      maxSize={500}
                      collapsed={bottomCollapsed}
                      firstPane={
                        <div className="h-full flex flex-col border-t border-[#1E2742] bg-[#080E20]">
                          <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1E2742]">
                            <div className="flex items-center gap-2">
                              <BarChart3 className="h-3.5 w-3.5 text-amber-400" />
                              <span className="font-mono text-[11px] uppercase tracking-wider text-slate-300">
                                物理分析 · 直方图
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {(['mass', 'pt', 'eta', 'energy'] as const).map(t => (
                                <button
                                  key={t}
                                  onClick={() => handleHistTypeChange(t)}
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-mono transition-colors ${
                                    activeType === t
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                      : 'text-slate-500 hover:text-slate-300'
                                  }`}
                                >
                                  {t === 'mass' ? 'M_inv' : t === 'pt' ? 'pT' : t.toUpperCase()}
                                </button>
                              ))}
                              <button
                                onClick={() => togglePanel('bottom')}
                                className="ml-1 p-0.5 rounded text-slate-500 hover:text-white hover:bg-[#1A2340]"
                              >
                                {bottomCollapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>
                          <div className="flex-1 min-h-0 relative data-export-target-analysis"
                            data-export-scope="analysis"
                          >
                            <HistogramChart histogram={histogram} color="#FFD54F" />
                          </div>
                        </div>
                      }
                      secondPane={
                        <div className="h-full flex flex-col min-h-0 data-export-target-all"
                          data-export-scope="all-views"
                        >
                          <SplitPane
                            direction="vertical"
                            initialSize={Math.max(260, window.innerHeight * 0.4)}
                            minSize={220}
                            firstPane={
                              <div className="h-full p-2">
                                <View3D />
                              </div>
                            }
                            secondPane={
                              <div className="h-full grid grid-cols-2 gap-2 p-2 pt-0">
                                <CrossSection />
                                <LongitudinalSection />
                              </div>
                            }
                          />
                        </div>
                      }
                    />
                  </div>
                </div>
              }
              secondPane={
                <CollapsiblePanel
                  collapsed={rightCollapsed}
                  direction="right"
                  toggle={() => togglePanel('right')}
                  className="border-l border-[#1E2742] bg-[#080E20]"
                >
                  <div className="p-3 h-full flex flex-col min-h-0">
                    <div className="rounded-md border border-[#2A3352] bg-[#0D1528] p-3 mb-3">
                      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-slate-300 mb-2">
                        <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                        事件摘要
                      </div>
                      {event ? (
                        <div className="space-y-1 font-mono text-[10.5px]">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Run</span>
                            <span className="text-emerald-300">{event.runNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">LumiBlock</span>
                            <span className="text-emerald-300">{event.luminosityBlock}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">粒子总数</span>
                            <span className="text-cyan-300">{event.particles.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">能量沉积数</span>
                            <span className="text-cyan-300">{event.energyDeposits.length}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-[#1E2742] mt-1">
                            <span className="text-slate-500">Σ E<sub>T</sub></span>
                            <span className="text-fuchsia-300">{event.totalET.toFixed(1)} GeV</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">MET</span>
                            <span className="text-rose-300">
                              {event.missingET.et.toFixed(1)} GeV
                              <span className="text-slate-500 ml-1">
                                φ={event.missingET.phi.toFixed(2)}
                              </span>
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500 font-mono text-center py-2">
                          加载数据后显示事件摘要
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <ParticleTable />
                    </div>
                  </div>
                </CollapsiblePanel>
              }
            />
          }
        />
      </div>

      {totalEvents === 0 && !importOpen && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#050810]/90 pointer-events-none">
          <div className="text-center max-w-md p-8 pointer-events-auto rounded-xl border border-cyan-500/30 bg-gradient-to-b from-[#0B1330] to-[#050810] shadow-2xl backdrop-blur">
            <div className="relative mx-auto mb-6 h-20 w-20">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500 via-fuchsia-500 to-amber-400 animate-pulse opacity-40 blur-xl" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#0B1330] border-2 border-cyan-500/50">
                <Atom className="h-10 w-10 text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 to-amber-300" strokeWidth={1.5} />
              </div>
            </div>
            <h2 className="mb-2 font-mono text-2xl font-bold tracking-tight text-white">
              HepVis <span className="text-cyan-300">Pro</span>
            </h2>
            <p className="mb-6 font-mono text-xs leading-relaxed text-slate-400">
              高能物理粒子对撞事件可视化工具
              <br />
              支持 ROOT / HDF5 数据格式，三维径迹重建，不变质量分析
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => loadMock()}
                className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2.5 font-mono text-sm font-bold text-white shadow-lg shadow-cyan-500/30 transition-all hover:shadow-cyan-500/50 hover:brightness-110"
              >
                ⚡ 快速加载 50 个模拟事件
              </button>
              <button
                onClick={() => setImportOpen(true)}
                className="w-full rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 font-mono text-sm text-cyan-200 transition-all hover:bg-cyan-500/20"
              >
                📂 导入用户数据 (ROOT/HDF5)
              </button>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center font-mono text-[9px] text-slate-500">
              <div className="rounded border border-[#1E2742] bg-[#070B18] py-1.5">
                三维径迹
                <div className="text-cyan-400 text-[10px]">3D Tracks</div>
              </div>
              <div className="rounded border border-[#1E2742] bg-[#070B18] py-1.5">
                截面联动
                <div className="text-fuchsia-400 text-[10px]">XY / RZ</div>
              </div>
              <div className="rounded border border-[#1E2742] bg-[#070B18] py-1.5">
                不变质量
                <div className="text-amber-400 text-[10px]">M_inv</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
};

export default Workspace;
