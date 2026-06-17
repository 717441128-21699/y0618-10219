import React from 'react';
import {
  Database, Download, ChevronLeft, ChevronRight, ChevronDown, BarChart2,
  PanelLeft, PanelRight, LayoutGrid, HelpCircle, Github, Maximize2,
} from 'lucide-react';
import { useViewStore } from '@/store/viewStore';
import { useEventStore } from '@/store/eventStore';
import { useAnalysisStore } from '@/store/analysisStore';
import { formatEnergy } from '@/utils/format';

interface TopBarProps {
  onOpenImport: () => void;
  onOpenExport: () => void;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  onToggleBottomPanel: () => void;
}

const TopBar: React.FC<TopBarProps> = ({
  onOpenImport, onOpenExport,
  onToggleLeftPanel, onToggleRightPanel, onToggleBottomPanel,
}) => {
  const leftCollapsed = useViewStore(s => s.leftPanelCollapsed);
  const rightCollapsed = useViewStore(s => s.rightPanelCollapsed);
  const bottomCollapsed = useViewStore(s => s.bottomPanelCollapsed);
  const currentEvent = useEventStore(s => s.currentEvent);
  const totalEvents = useEventStore(s => s.totalEvents);
  const currentIndex = useEventStore(s => s.currentEventIndex);
  const nextEvent = useEventStore(s => s.nextEvent);
  const prevEvent = useEventStore(s => s.prevEvent);
  const isFirst = useEventStore(s => s.isFirstEvent);
  const isLast = useEventStore(s => s.isLastEvent);
  const loadMockData = useEventStore(s => s.loadMockData);
  const clearAnalysis = useAnalysisStore(s => s.clearAnalysis);
  const clearSelection = useViewStore(s => s.clearSelection);

  const handleReset = () => {
    clearAnalysis();
    clearSelection();
  };

  return (
    <header
      data-export-scope="workspace"
      className="relative flex h-12 shrink-0 items-center gap-2 border-b border-[#1E2742] bg-gradient-to-r from-[#060A1A] via-[#0B1330] to-[#060A1A] px-3 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2.5 pr-3 border-r border-[#1E2742]">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-cyan-500/80 via-fuchsia-500/70 to-amber-400/80 shadow-[0_0_10px_rgba(6,182,212,0.4)]">
          <BarChart2 className="h-4 w-4 text-[#060A1A]" strokeWidth={2.8} />
        </div>
        <div className="leading-tight">
          <div className="font-mono text-[13px] font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white 60% to-amber-200">
            HepVis Pro
          </div>
          <div className="font-mono text-[8.5px] tracking-widest text-slate-500 -mt-0.5">
            HIGH ENERGY PHYSICS EVENT VISUALIZER · v1.0
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 px-2 border-r border-[#1E2742]">
        <button
          onClick={onOpenImport}
          className="group flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[11px] text-slate-300 transition-all hover:bg-cyan-500/15 hover:text-cyan-300"
          title="导入事件数据"
        >
          <Database className="h-3.5 w-3.5 text-cyan-400 group-hover:drop-shadow-[0_0_4px_rgba(6,182,212,0.6)]" />
          导入数据
        </button>
        <button
          onClick={() => loadMockData()}
          className="flex items-center gap-1.5 rounded-md border border-slate-500/20 bg-[#10182E]/70 px-2.5 py-1.5 font-mono text-[10.5px] text-amber-300 transition-all hover:bg-amber-500/10 hover:border-amber-400/30"
          title="快速加载示例模拟数据"
        >
          ⚡ 加载示例
        </button>
        <button
          onClick={onOpenExport}
          disabled={totalEvents === 0}
          className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 font-mono text-[11px] text-emerald-300 transition-all hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="h-3.5 w-3.5" />
          导出图像
        </button>
      </div>

      {totalEvents > 0 && (
        <div className="flex items-center gap-1 px-2 border-r border-[#1E2742]">
          <button
            onClick={prevEvent}
            disabled={isFirst}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-[#1A2340] hover:text-white disabled:opacity-30"
            title="上一事件 (←)"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex flex-col items-center px-1 min-w-[70px]">
            <span className="font-mono text-[11px] font-bold text-amber-300 leading-none">
              {currentIndex + 1}
              <span className="text-slate-500 font-normal"> / {totalEvents}</span>
            </span>
            <span className="font-mono text-[8.5px] text-cyan-400/70 leading-tight">
              Evt #{currentEvent?.eventId ?? '---'}
            </span>
          </div>
          <button
            onClick={nextEvent}
            disabled={isLast}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-[#1A2340] hover:text-white disabled:opacity-30"
            title="下一事件 (→)"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {currentEvent && (
        <div className="hidden lg:flex items-center gap-3 px-2 border-r border-[#1E2742]">
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="text-slate-500">ΣE<sub>T</sub></span>
            <span className="text-fuchsia-300 font-bold">{formatEnergy(currentEvent.totalET)}</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="text-slate-500">MET</span>
            <span className="text-rose-300 font-bold">{formatEnergy(currentEvent.missingET.et)}</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="text-slate-500">粒子</span>
            <span className="text-emerald-300 font-bold">{currentEvent.particles.length}</span>
          </div>
        </div>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-1 px-2 border-l border-[#1E2742]">
        <div className="hidden md:flex items-center gap-0.5 pr-1">
          <button
            onClick={onToggleLeftPanel}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
              leftCollapsed ? 'text-slate-500' : 'text-cyan-300 bg-cyan-500/10'
            } hover:bg-[#1A2340]`}
            title="切换左侧面板"
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onToggleBottomPanel}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
              bottomCollapsed ? 'text-slate-500' : 'text-amber-300 bg-amber-500/10'
            } hover:bg-[#1A2340]`}
            title="切换分析面板"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onToggleRightPanel}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
              rightCollapsed ? 'text-slate-500' : 'text-fuchsia-300 bg-fuchsia-500/10'
            } hover:bg-[#1A2340]`}
            title="切换右侧面板"
          >
            <PanelRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          onClick={handleReset}
          className="flex h-7 items-center gap-1 rounded-md px-1.5 text-slate-400 font-mono text-[10px] transition-colors hover:bg-[#1A2340] hover:text-white"
          title="清除选择与分析"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          <span className="hidden md:inline">重置视图</span>
        </button>
      </div>

      <div className="flex items-center gap-0.5 pl-2 border-l border-[#1E2742]">
        <button
          onClick={() => {
            if (document.fullscreenElement) document.exitFullscreen();
            else document.documentElement.requestFullscreen();
          }}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-[#1A2340] hover:text-white"
          title="全屏模式"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <a
          href="https://root.cern/"
          target="_blank"
          rel="noreferrer"
          className="hidden sm:flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-[#1A2340] hover:text-white"
          title="关于 ROOT 数据格式"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </a>
        <div className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:text-white transition-colors"
          title="科研用途，无商业限制">
          <Github className="h-3.5 w-3.5" />
        </div>
      </div>

      {totalEvents === 0 && (
        <div className="absolute inset-x-0 -bottom-[1px] h-[2px] animate-pulse bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
      )}
    </header>
  );
};

export default TopBar;
