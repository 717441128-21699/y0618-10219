import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from 'recharts';
import type { HistogramData, HistogramBin } from '@/types/physics';
import { histogramToRechartsBars } from '@/services/analysis/histogram';

interface HistogramChartProps {
  histogram: HistogramData | null;
  color?: string;
  height?: number;
  onBinClick?: (bin: HistogramBin) => void;
}

const HistogramChart: React.FC<HistogramChartProps> = ({
  histogram, color = '#00D4FF', height = 240, onBinClick,
}) => {
  const data = useMemo(() => {
    if (!histogram) return [];
    return histogramToRechartsBars(histogram);
  }, [histogram]);

  if (!histogram || data.length === 0) {
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

  const formatX = (v: number) => {
    if (histogram.binWidth > 10) return v.toFixed(0);
    if (histogram.binWidth > 1) return v.toFixed(1);
    return v.toFixed(2);
  };

  const statsBox = (
    <div className="absolute right-3 top-3 z-10 font-mono text-[10.5px] space-y-0.5 bg-black/50 rounded px-2 py-1.5 border border-slate-600/30 backdrop-blur-sm text-slate-300">
      <div><span className="text-slate-500">Entries:</span> <span className="text-emerald-300">{histogram.entries}</span></div>
      <div><span className="text-slate-500">Mean:</span> <span className="text-amber-300">{histogram.mean.toFixed(3)}</span></div>
      <div><span className="text-slate-500">RMS:</span> <span className="text-rose-300">{histogram.rms.toFixed(3)}</span></div>
      {histogram.underflow > 0 && <div className="text-slate-500">Underflow: {histogram.underflow}</div>}
      {histogram.overflow > 0 && <div className="text-slate-500">Overflow: {histogram.overflow}</div>}
    </div>
  );

  return (
    <div className="relative h-full w-full">
      {statsBox}
      {histogram.title && (
        <div className="absolute left-3 top-2 z-10 font-mono text-[11px] font-semibold text-slate-200">
          {histogram.title}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 40, right: 140, left: 48, bottom: 40 }}
          barCategoryGap={0}
          barGap={0}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2742" vertical={false} />
          <XAxis
            dataKey="x"
            type="number"
            domain={[histogram.xMin, histogram.xMax]}
            tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            tickLine={{ stroke: '#475569' }}
            axisLine={{ stroke: '#475569' }}
            tickFormatter={formatX}
            label={{
              value: histogram.xLabel,
              position: 'insideBottom',
              offset: -22,
              fill: '#CBD5E1',
              fontSize: 11,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          />
          <YAxis
            tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            tickLine={{ stroke: '#475569' }}
            axisLine={{ stroke: '#475569' }}
            allowDecimals={false}
            label={{
              value: histogram.yLabel,
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              fill: '#CBD5E1',
              fontSize: 11,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          />
          <Tooltip
            cursor={{ stroke: '#64748B', strokeDasharray: '4 4' }}
            contentStyle={{
              background: 'rgba(5, 8, 16, 0.95)',
              border: '1px solid #2A3352',
              borderRadius: 4,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10.5,
              color: '#E8ECF4',
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
            {data.map((_, i) => (
              <Cell key={i} fill={color} fillOpacity={0.75} stroke={color} strokeWidth={0.4} strokeOpacity={0.9} />
            ))}
          </Bar>
          {histogram.mean > 0 && (
            <ReferenceLine
              x={histogram.mean}
              stroke="#FFD54F"
              strokeDasharray="5 3"
              strokeWidth={1.4}
              label={{
                value: `μ=${histogram.mean.toFixed(2)}`,
                position: 'top',
                fill: '#FFD54F',
                fontSize: 10,
                fontFamily: 'JetBrains Mono, monospace',
              }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HistogramChart;
