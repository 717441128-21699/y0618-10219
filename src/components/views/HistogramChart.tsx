import React, { useMemo, useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, Legend,
} from 'recharts';
import type { HistogramData, HistogramBin, DecayChannelKey, MassHistogramChannel } from '@/types/physics';
import { histogramToRechartsBars } from '@/services/analysis/histogram';
import { useAnalysisStore, CHANNEL_LABELS } from '@/store/analysisStore';
import { useEventStore } from '@/store/eventStore';
import {
  Layers, Eye, EyeOff, Flame, Target, ChevronDown, ChevronUp, X,
} from 'lucide-react';

interface HistogramChartProps {
  histogram: HistogramData | null;
  color?: string;
  height?: number;
  onBinClick?: (bin: HistogramBin) => void;
}

const HistogramChart: React.FC<HistogramChartProps> = ({
  histogram, color = '#00D4FF', height = 260, onBinClick,
}) => {
  const channels = useAnalysisStore(s => s.channels);
  const activeChannel = useAnalysisStore(s => s.activeChannel);
  const setActiveChannel = useAnalysisStore(s => s.setActiveChannel);
  const showAll = useAnalysisStore(s => s.showAllChannelsInHistogram);
  const toggleShowAll = useAnalysisStore(s => s.toggleShowAllChannels);
  const findPeakEvents = useAnalysisStore(s => s.findPeakEvents);
  const peakCandidates = useAnalysisStore(s => s.peakCandidates);
  const gotoEvent = useEventStore(s => s.gotoEvent);
  const rebuildAll = useAnalysisStore(s => s.rebuildAllChannelHistograms);
  const activeHist = histogram ?? channels[activeChannel]?.histogram;
  const [peakExpanded, setPeakExpanded] = useState(false);
  const [sigma, setSigma] = useState(2.0);

  useEffect(() => { rebuildAll(); }, [rebuildAll]);

  const channelsWithData = useMemo(
    () => (Object.keys(channels) as DecayChannelKey[]).filter(k => channels[k].pairs.length > 0),
    [channels],
  );

  const multiData = useMemo(() => {
    if (!showAll || channelsWithData.length === 0) return null;
    const firstHist = channels[channelsWithData[0]].histogram;
    if (!firstHist) return null;
    const nBins = firstHist.bins.length;
    const arr = Array.from({ length: nBins }, (_, i) => {
      const row: any = { x: (firstHist.binEdges[i] + firstHist.binEdges[i + 1]) / 2 };
      channelsWithData.forEach(k => {
        row[k] = channels[k].histogram?.bins[i] ?? 0;
      });
      return row;
    });
    return arr;
  }, [showAll, channelsWithData, channels]);

  const singleData = useMemo(() => {
    if (!activeHist) return [];
    return histogramToRechartsBars(activeHist);
  }, [activeHist]);

  const formatX = (v: number) => {
    if (!activeHist) return v.toFixed(1);
    if (activeHist.binWidth > 10) return v.toFixed(0);
    if (activeHist.binWidth > 1) return v.toFixed(1);
    return v.toFixed(2);
  };

  if ((!activeHist || singleData.length === 0) && channelsWithData.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center font-mono text-xs text-slate-500">
          <div className="mb-2 text-4xl">📊</div>
          <div>暂无直方图数据</div>
          <div className="mt-1 text-[10.5px] opacity-70">
            在右侧面板选择两个粒子以计算不变质量
          </div>
        </div>
      </div>
    );
  }

  const mainHist = activeHist!;
  const statsBox = (
    <div className="absolute right-3 top-3 z-10 font-mono text-[10.5px] space-y-0.5 bg-black/55 rounded px-2.5 py-1.5 border border-slate-600/30 backdrop-blur-sm text-slate-300">
      <div className="flex items-center gap-1 text-[10px] text-slate-400 border-b border-slate-700/50 pb-0.5 mb-1">
        <Target className="h-2.5 w-2.5" /> {CHANNEL_LABELS[activeChannel].name}
      </div>
      <div><span className="text-slate-500">Entries:</span> <span className="text-emerald-300">{mainHist.entries}</span></div>
      <div><span className="text-slate-500">Mean:</span> <span className="text-amber-300">{mainHist.mean.toFixed(3)}</span></div>
      <div><span className="text-slate-500">RMS:</span> <span className="text-rose-300">{mainHist.rms.toFixed(3)}</span></div>
      {mainHist.underflow > 0 && <div className="text-slate-500">Underflow: {mainHist.underflow}</div>}
      {mainHist.overflow > 0 && <div className="text-slate-500">Overflow: {mainHist.overflow}</div>}
    </div>
  );

  return (
    <div className="relative h-full w-full flex flex-col" data-export-scope="analysis">
      <div className="flex items-center justify-between px-2 pt-2 pb-1 border-b border-[#1E2742] bg-[#070B18]/60">
        <div className="flex flex-wrap items-center gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mr-1.5">通道</span>
          <button
            onClick={toggleShowAll}
            className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-mono transition-colors ${
              showAll
                ? 'border-amber-400/60 bg-amber-400/10 text-amber-200'
                : 'border-[#2A3352] bg-[#0B1228] text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-2.5 w-2.5" /> {showAll ? '叠加' : '单通道'}
          </button>
          {(['ee', 'mumu', 'gammagamma', 'tautau', 'bb', 'll', 'jj', 'custom'] as DecayChannelKey[]).map(k => {
            const has = channels[k].pairs.length > 0;
            const active = activeChannel === k && !showAll;
            const lbl = CHANNEL_LABELS[k];
            return (
              <button
                key={k}
                onClick={() => setActiveChannel(k)}
                disabled={!has}
                className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-mono transition-colors ${
                  active
                    ? 'text-white shadow-[0_0_10px_rgba(255,255,255,0.12)]'
                    : has
                      ? 'border-[#2A3352] bg-[#0B1228] text-slate-400 hover:text-slate-200'
                      : 'border-transparent text-slate-700 cursor-not-allowed'
                }`}
                style={active ? { borderColor: lbl.color + 'AA', backgroundColor: lbl.color + '25' } : {}}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: has ? lbl.color : '#334155' }}
                />
                {lbl.shortName}
                <span className="text-slate-500/80 ml-0.5">{channels[k].pairs.length || ''}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 rounded border border-[#2A3352] bg-[#0B1228] px-1.5 py-0.5">
            <Flame className={`h-2.5 w-2.5 ${peakCandidates.length > 0 ? 'text-orange-300' : 'text-slate-600'}`} />
            <span className="font-mono text-[9.5px] text-slate-400">
              {peakCandidates.length} 候选峰
            </span>
          </div>
          <button
            onClick={() => { findPeakEvents(sigma); setPeakExpanded(true); }}
            className="flex items-center gap-1 rounded border border-orange-400/40 bg-orange-400/10 px-1.5 py-0.5 text-[10px] font-mono text-orange-200 hover:bg-orange-400/20"
          >
            <Target className="h-2.5 w-2.5" /> 寻峰 ({sigma.toFixed(1)}σ)
          </button>
          <input
            type="range"
            min={1}
            max={5}
            step={0.25}
            value={sigma}
            onChange={e => setSigma(parseFloat(e.target.value))}
            title="寻峰阈值σ"
            className="h-1.5 w-14 cursor-pointer appearance-none rounded-full bg-[#1E2742] accent-orange-400"
          />
        </div>
      </div>

      {peakExpanded && peakCandidates.length > 0 && (
        <div className="mx-2 my-1 rounded border border-orange-500/30 bg-orange-500/5 overflow-hidden">
          <div className="flex items-center justify-between px-2 py-1 border-b border-orange-500/20 bg-orange-500/10">
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-orange-200">
              <Flame className="h-2.5 w-2.5" />
              峰值候选事件 ({peakCandidates.length}) — 点击跳转
            </div>
            <div className="flex items-center gap-1">
              {peakExpanded
                ? <ChevronUp className="h-3 w-3 text-orange-300" onClick={() => setPeakExpanded(false)} />
                : <ChevronDown className="h-3 w-3 text-orange-300" onClick={() => setPeakExpanded(true)} />}
              <button onClick={() => setPeakExpanded(false)} className="text-slate-400 hover:text-rose-300">
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="max-h-20 overflow-auto p-1 space-y-0.5">
            {peakCandidates.slice(0, 50).map((pk, i) => (
              <button
                key={pk.pairId + i}
                onClick={() => gotoEvent(pk.eventId)}
                className="w-full flex items-center justify-between rounded px-1.5 py-0.5 text-[10px] font-mono hover:bg-orange-500/10 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span className="rounded px-1 bg-slate-800 text-slate-300">Ev#{pk.eventId}</span>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CHANNEL_LABELS[pk.histogramKey].color }} />
                  <span className="text-slate-400">{CHANNEL_LABELS[pk.histogramKey].shortName}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span>m = <span className="text-amber-300">{pk.mass.toFixed(2)} GeV</span></span>
                  <span className="text-slate-500">ΔR={pk.deltaR?.toFixed(2) ?? '—'}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative flex-1 min-h-0">
        {statsBox}
        {mainHist.title && (
          <div className="absolute left-3 top-2 z-10 font-mono text-[11px] font-semibold text-slate-200">
            {showAll
              ? `多通道叠加不变质量分布（${channelsWithData.length} 通道）`
              : mainHist.title}
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          {showAll && multiData ? (
            <BarChart
              data={multiData}
              margin={{ top: 40, right: 140, left: 48, bottom: 40 }}
              barCategoryGap={0}
              barGap={1}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2742" vertical={false} />
              <XAxis
                dataKey="x"
                type="number"
                domain={[mainHist.xMin, mainHist.xMax]}
                tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                tickLine={{ stroke: '#475569' }}
                axisLine={{ stroke: '#475569' }}
                tickFormatter={formatX}
                label={{
                  value: mainHist.xLabel, position: 'insideBottom', offset: -22,
                  fill: '#CBD5E1', fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
                }}
              />
              <YAxis
                tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                tickLine={{ stroke: '#475569' }}
                axisLine={{ stroke: '#475569' }}
                allowDecimals={false}
                label={{
                  value: mainHist.yLabel, angle: -90, position: 'insideLeft', offset: 10,
                  fill: '#CBD5E1', fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
                }}
              />
              <Tooltip
                cursor={{ stroke: '#64748B', strokeDasharray: '4 4' }}
                contentStyle={{
                  background: 'rgba(5, 8, 16, 0.95)', border: '1px solid #2A3352',
                  borderRadius: 4, fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10.5, color: '#E8ECF4',
                }}
                labelFormatter={(l: number) => `Bin: ${formatX(l)} ${mainHist.xLabel}`}
              />
              <Legend
                wrapperStyle={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5 }}
                formatter={(k) => CHANNEL_LABELS[k as DecayChannelKey]?.name || String(k)}
              />
              <ReferenceLine y={0} stroke="#475569" />
              {channelsWithData.map(k => (
                <Bar
                  key={k}
                  dataKey={k}
                  stackId={undefined}
                  isAnimationActive={false}
                  fill={CHANNEL_LABELS[k].color}
                  fillOpacity={0.55}
                  stroke={CHANNEL_LABELS[k].color}
                  strokeWidth={0.6}
                />
              ))}
              {mainHist.mean > 0 && (
                <ReferenceLine
                  x={mainHist.mean}
                  stroke="#FFD54F"
                  strokeDasharray="5 3"
                  strokeWidth={1.4}
                  label={{
                    value: `μ=${mainHist.mean.toFixed(2)}`, position: 'top',
                    fill: '#FFD54F', fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                  }}
                />
              )}
            </BarChart>
          ) : (
            <BarChart
              data={singleData}
              margin={{ top: 40, right: 140, left: 48, bottom: 40 }}
              barCategoryGap={0}
              barGap={0}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2742" vertical={false} />
              <XAxis
                dataKey="x"
                type="number"
                domain={[mainHist.xMin, mainHist.xMax]}
                tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                tickLine={{ stroke: '#475569' }}
                axisLine={{ stroke: '#475569' }}
                tickFormatter={formatX}
                label={{
                  value: mainHist.xLabel, position: 'insideBottom', offset: -22,
                  fill: '#CBD5E1', fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
                }}
              />
              <YAxis
                tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                tickLine={{ stroke: '#475569' }}
                axisLine={{ stroke: '#475569' }}
                allowDecimals={false}
                label={{
                  value: mainHist.yLabel, angle: -90, position: 'insideLeft', offset: 10,
                  fill: '#CBD5E1', fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
                }}
              />
              <Tooltip
                cursor={{ stroke: '#64748B', strokeDasharray: '4 4' }}
                contentStyle={{
                  background: 'rgba(5, 8, 16, 0.95)', border: '1px solid #2A3352',
                  borderRadius: 4, fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10.5, color: '#E8ECF4',
                }}
                labelFormatter={(l: number) => `Bin: ${formatX(l)}`}
                formatter={(v: number) => [`${v}`, 'Entries']}
              />
              <ReferenceLine y={0} stroke="#475569" />
              <Bar
                dataKey="y"
                isAnimationActive={false}
                onClick={(bin: any) => onBinClick?.(bin as HistogramBin)}
                style={{ cursor: onBinClick ? 'pointer' : 'default' }}
              >
                {singleData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={CHANNEL_LABELS[activeChannel].color || color}
                    fillOpacity={0.75}
                    stroke={CHANNEL_LABELS[activeChannel].color || color}
                    strokeWidth={0.4}
                    strokeOpacity={0.9}
                  />
                ))}
              </Bar>
              {mainHist.mean > 0 && (
                <ReferenceLine
                  x={mainHist.mean}
                  stroke="#FFD54F"
                  strokeDasharray="5 3"
                  strokeWidth={1.4}
                  label={{
                    value: `μ=${mainHist.mean.toFixed(2)}`, position: 'top',
                    fill: '#FFD54F', fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                  }}
                />
              )}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export { CHANNEL_LABELS };
export default HistogramChart;
