import type { HistogramData, HistogramBin } from '@/types/physics';

export interface HistogramOptions {
  title?: string;
  xLabel?: string;
  yLabel?: string;
  includeStats?: boolean;
}

export function buildHistogram(
  data: number[],
  bins: number = 50,
  xMin?: number,
  xMax?: number,
  options: HistogramOptions = {},
): HistogramData {
  if (data.length === 0) {
    return {
      title: options.title || '',
      xLabel: options.xLabel || '',
      yLabel: options.yLabel || 'Entries',
      bins: new Array(bins).fill(0),
      binEdges: [],
      binWidth: 0,
      xMin: 0,
      xMax: 0,
      entries: 0,
      mean: 0,
      rms: 0,
      underflow: 0,
      overflow: 0,
    };
  }

  let min = xMin !== undefined ? xMin : Math.min(...data);
  let max = xMax !== undefined ? xMax : Math.max(...data);

  if (min === max) {
    min -= 1;
    max += 1;
  }

  const binWidth = (max - min) / bins;
  const binEdges: number[] = [];
  for (let i = 0; i <= bins; i++) {
    binEdges.push(min + i * binWidth);
  }

  const counts = new Array(bins).fill(0);
  let underflow = 0;
  let overflow = 0;

  for (const v of data) {
    if (v < min) {
      underflow++;
    } else if (v >= max) {
      overflow++;
    } else {
      const idx = Math.min(bins - 1, Math.floor((v - min) / binWidth));
      counts[idx]++;
    }
  }

  let sum = 0;
  let sum2 = 0;
  const entries = data.length;
  for (const v of data) {
    sum += v;
    sum2 += v * v;
  }
  const mean = sum / entries;
  const variance = entries > 1 ? Math.max(0, sum2 / entries - mean * mean) : 0;
  const rms = Math.sqrt(variance);

  return {
    title: options.title || '',
    xLabel: options.xLabel || '',
    yLabel: options.yLabel || 'Entries',
    bins: counts,
    binEdges,
    binWidth,
    xMin: min,
    xMax: max,
    entries,
    mean,
    rms,
    underflow,
    overflow,
  };
}

export function histogramToRechartsBars(hist: HistogramData): HistogramBin[] {
  const result: HistogramBin[] = [];
  for (let i = 0; i < hist.bins.length; i++) {
    const xMin = hist.binEdges[i] ?? 0;
    const xMax = hist.binEdges[i + 1] ?? xMin + hist.binWidth;
    result.push({
      x: (xMin + xMax) / 2,
      y: hist.bins[i],
      xMin,
      xMax,
    });
  }
  return result;
}

export function rebinnedHistogram(
  hist: HistogramData,
  rebinFactor: number,
): HistogramData {
  if (rebinFactor <= 1) return hist;
  const newBinsCount = Math.ceil(hist.bins.length / rebinFactor);
  const newBins = new Array(newBinsCount).fill(0);
  const newEdges: number[] = [];
  for (let i = 0; i < newBinsCount; i++) {
    const start = i * rebinFactor;
    const end = Math.min(start + rebinFactor, hist.bins.length);
    for (let j = start; j < end; j++) {
      newBins[i] += hist.bins[j];
    }
    newEdges.push(hist.binEdges[start] ?? 0);
  }
  newEdges.push(hist.binEdges[hist.binEdges.length - 1] ?? 0);
  return {
    ...hist,
    bins: newBins,
    binEdges: newEdges,
    binWidth: newBinsCount > 0 ? (hist.xMax - hist.xMin) / newBinsCount : 0,
  };
}
