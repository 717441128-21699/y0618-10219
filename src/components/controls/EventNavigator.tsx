import React from 'react';
import {
  ChevronLeft, ChevronRight, ChevronFirst, ChevronLast,
  Star, StarOff, ArrowRightLeft, List, Loader2, Database, Calculator,
} from 'lucide-react';
import { useEventStore } from '@/store/eventStore';
import type { FieldSource } from '@/types/physics';

const SourceBadge: React.FC<{ source: FieldSource }> = ({ source }) => (
  <span className={`ml-1 inline-flex items-center gap-0.5 rounded px-1 text-[8px] ${
    source === 'file'
      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
      : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
  }`}>
    {source === 'file' ? <Database className="h-2 w-2" /> : <Calculator className="h-2 w-2" />}
    {source === 'file' ? '文件' : '默认'}
  </span>
);

const EventNavigator: React.FC = () => {
  const currentIndex = useEventStore(s => s.currentEventIndex);
  const totalEvents = useEventStore(s => s.totalEvents);
  const isFirst = useEventStore(s => s.isFirstEvent);
  const isLast = useEventStore(s => s.isLastEvent);
  const gotoEvent = useEventStore(s => s.gotoEvent);
  const nextEvent = useEventStore(s => s.nextEvent);
  const prevEvent = useEventStore(s => s.prevEvent);
  const isCandidate = useEventStore(s => s.isCandidate);
  const candidateEventIds = useEventStore(s => s.candidateEventIds);
  const toggleCandidate = useEventStore(s => s.toggleCandidate);
  const currentEvent = useEventStore(s => s.currentEvent);
  const isLoading = useEventStore(s => s.isLoading);
  const loadedFormat = useEventStore(s => s.loadedFormat);

  const [jumpInput, setJumpInput] = React.useState('');
  const [showList, setShowList] = React.useState(false);

  const handleJump = () => {
    const v = parseInt(jumpInput, 10);
    if (!isNaN(v) && v >= 1 && v <= totalEvents) {
      gotoEvent(v - 1);
      setJumpInput('');
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-md border border-[#2A3352] bg-[#0D1528] p-4">
        <div className="flex items-center gap-2 text-cyan-300 font-mono text-xs">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在加载事件数据...
        </div>
      </div>
    );
  }

  if (totalEvents === 0 || !currentEvent) {
    return (
      <div className="rounded-md border border-[#2A3352] bg-[#0D1528] p-4">
        <div className="text-center font-mono text-xs text-slate-500">
          尚未加载事件数据
          <div className="mt-1 text-[10.5px] opacity-70">使用顶部导入数据或加载示例</div>
        </div>
      </div>
    );
  }

  const ev = currentEvent as any;
  const runNumberSource: FieldSource = ev.runNumberSource ?? 'derived';
  const lumiSource: FieldSource = ev.luminosityBlockSource ?? 'derived';
  const eventIdSource: FieldSource = ev.eventIdSource ?? 'derived';

  return (
    <div className="space-y-3 rounded-md border border-[#2A3352] bg-[#0D1528] p-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[11px] uppercase tracking-wider text-slate-300">
          事件浏览器
        </div>
        <button
          onClick={() => setShowList(!showList)}
          className="text-slate-400 hover:text-cyan-300 transition-colors"
          title="事件列表"
        >
          <List className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-1.5 text-[10px] font-mono">
        <div className="rounded border border-[#1E2742] bg-[#070B18] px-2 py-1.5">
          <div className="flex items-center justify-between">
            <div className="text-slate-500">RUN</div>
            <SourceBadge source={runNumberSource} />
          </div>
          <div className={`${runNumberSource === 'file' ? 'text-emerald-300' : 'text-slate-400'} text-[12px] font-bold`}>
            {currentEvent.runNumber}
          </div>
        </div>
        <div className="rounded border border-[#1E2742] bg-[#070B18] px-2 py-1.5">
          <div className="flex items-center justify-between">
            <div className="text-slate-500">LUMI</div>
            <SourceBadge source={lumiSource} />
          </div>
          <div className={`${lumiSource === 'file' ? 'text-emerald-300' : 'text-slate-400'} text-[12px] font-bold`}>
            {currentEvent.luminosityBlock}
          </div>
        </div>
        <div className="rounded border border-[#1E2742] bg-[#070B18] px-2 py-1.5">
          <div className="flex items-center justify-between">
            <div className="text-slate-500">EVENT ID</div>
            <SourceBadge source={eventIdSource} />
          </div>
          <div className={`${eventIdSource === 'file' ? 'text-cyan-300' : 'text-slate-400'} text-[13px] font-bold`}>
            {currentEvent.eventId}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded border border-[#1E2742] bg-[#070B18] px-2 py-1">
        <button
          onClick={() => gotoEvent(0)}
          disabled={isFirst}
          className="p-1 rounded hover:bg-[#1A2340] disabled:opacity-30 text-slate-300 transition-colors"
          title="首个事件"
        >
          <ChevronFirst className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={prevEvent}
          disabled={isFirst}
          className="p-1 rounded hover:bg-[#1A2340] disabled:opacity-30 text-slate-300 transition-colors"
          title="上一事件"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="font-mono text-[11px] text-center">
          <span className="text-amber-300 font-bold">{currentIndex + 1}</span>
          <span className="text-slate-500"> / {totalEvents}</span>
        </div>
        <button
          onClick={nextEvent}
          disabled={isLast}
          className="p-1 rounded hover:bg-[#1A2340] disabled:opacity-30 text-slate-300 transition-colors"
          title="下一事件"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => gotoEvent(totalEvents - 1)}
          disabled={isLast}
          className="p-1 rounded hover:bg-[#1A2340] disabled:opacity-30 text-slate-300 transition-colors"
          title="末个事件"
        >
          <ChevronLast className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <input
            type="number"
            min={1}
            max={totalEvents}
            value={jumpInput}
            onChange={e => setJumpInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJump()}
            placeholder="# 跳转到..."
            className="w-full rounded border border-[#1E2742] bg-[#070B18] px-2 py-1.5 pr-7 text-[11px] font-mono text-slate-200 placeholder:text-slate-600 outline-none focus:border-cyan-500/60"
          />
          <button
            onClick={handleJump}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-slate-500 hover:text-cyan-300"
          >
            <ArrowRightLeft className="h-3 w-3" />
          </button>
        </div>
        <button
          onClick={() => toggleCandidate()}
          className={`flex items-center gap-1 rounded border px-2 py-1.5 text-[10.5px] font-mono transition-colors ${
            isCandidate
              ? 'border-amber-500/60 bg-amber-500/10 text-amber-300'
              : 'border-[#1E2742] bg-[#070B18] text-slate-400 hover:text-amber-300 hover:border-amber-500/30'
          }`}
          title="标记/取消候选事件"
        >
          {isCandidate ? <Star className="h-3 w-3 fill-current" /> : <StarOff className="h-3 w-3" />}
          <span>{isCandidate ? '候选' : '标为候选'}</span>
        </button>
      </div>

      <div className="rounded border border-[#1E2742] bg-[#070B18] px-2 py-1.5 text-[10.5px] font-mono">
        <div className="flex justify-between">
          <span className="text-slate-500">候选事件</span>
          <span className="text-amber-300">{candidateEventIds.size}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">数据格式</span>
          <span className="text-fuchsia-300 uppercase">{loadedFormat || '-'}</span>
        </div>
      </div>

      {showList && (
        <div className="max-h-48 overflow-y-auto rounded border border-[#1E2742] bg-[#070B18]">
          {useEventStore.getState().events.map((ev, idx) => (
            <button
              key={ev.eventId}
              onClick={() => { gotoEvent(idx); setShowList(false); }}
              className={`flex w-full items-center justify-between border-b border-[#151D34] px-2 py-1 text-[10.5px] font-mono text-left transition-colors hover:bg-[#1A2340] ${
                idx === currentIndex ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-slate-500 w-8">{idx + 1}.</span>
                <span>#{ev.eventId}</span>
                <span className="text-slate-500 text-[9.5px]">p={ev.particles.length}</span>
              </span>
              {candidateEventIds.has(ev.eventId) && <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventNavigator;
