import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Download, Image as ImageIcon, FileImage, FileText, Loader2, X, CheckCircle2,
  Monitor, Maximize2, Columns, BarChart3, Eye, EyeOff, ZoomIn, ZoomOut,
  FileOutput, LayoutDashboard, Printer, Aperture,
} from 'lucide-react';
import {
  exportVisualization,
  PRESET_SIZES,
  type ExportFormat,
  type ExportScope,
  renderCompositionToImage,
} from '@/services/export/imageExporter';
import { useEventStore } from '@/store/eventStore';
import { useAnalysisStore, CHANNEL_LABELS } from '@/store/analysisStore';
import type { ParticleType } from '@/types/physics';
import { PARTICLE_COLORS, PARTICLE_SYMBOLS, PARTICLE_NAMES } from '@/utils/colors';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

type CompositionMode = 'publication' | 'figure-only' | 'slides';

const COMPOSITIONS: Record<CompositionMode, {
  name: string; icon: any; description: string;
  layout: 'grid-2x2' | 'top-bottom' | 'left-right' | 'single-large';
  showHistogram: boolean; showLegend: boolean; showEventInfo: boolean;
}> = {
  publication: {
    name: '论文发表排版',
    icon: FileOutput,
    description: '三视图+直方图+图例+事件信息，PRL/期刊标准布局',
    layout: 'grid-2x2',
    showHistogram: true, showLegend: true, showEventInfo: true,
  },
  'figure-only': {
    name: '纯图像',
    icon: ImageIcon,
    description: '仅导出图像元素，不叠加文字标题',
    layout: 'left-right',
    showHistogram: false, showLegend: true, showEventInfo: false,
  },
  slides: {
    name: '报告幻灯片',
    icon: LayoutDashboard,
    description: '大3D图+底部小XY/RZ图，标题醒目，适合会议展示',
    layout: 'top-bottom',
    showHistogram: true, showLegend: true, showEventInfo: true,
  },
};

const ExportDialog: React.FC<ExportDialogProps> = ({ open, onClose }) => {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [scope, setScope] = useState<ExportScope>('all-views');
  const [preset, setPreset] = useState<string>('fig-prl-single');
  const [dpi, setDpi] = useState<number>(300);
  const [transparent, setTransparent] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [composition, setComposition] = useState<CompositionMode>('publication');
  const [previewZoom, setPreviewZoom] = useState<number>(0.5);
  const [showPreview, setShowPreview] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showEventInfo, setShowEventInfo] = useState(true);
  const [showHistogram, setShowHistogram] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);

  const currentEvent = useEventStore(s => s.currentEvent);
  const eventIndex = useEventStore(s => s.currentEventIndex);
  const totalEvents = useEventStore(s => s.totalEvents);
  const loadedFile = useEventStore(s => s.loadedFileName);
  const loadedFormat = useEventStore(s => s.loadedFormat);
  const activeChannel = useAnalysisStore(s => s.activeChannel);
  const activeHist = useAnalysisStore(s => s.channels[activeChannel].histogram);
  const activePairCount = useAnalysisStore(s => s.channels[activeChannel].pairs.length);

  const previewRef = useRef<HTMLDivElement>(null);

  const presetData = PRESET_SIZES[preset] || PRESET_SIZES['fig-slide-16-9'];
  const comp = COMPOSITIONS[composition];

  const aspectRatio = useMemo(
    () => presetData.width / presetData.height,
    [presetData],
  );
  const previewBoxWidth = 420;
  const previewBoxHeight = Math.round(previewBoxWidth / aspectRatio);

  const generatePreview = async () => {
    if (!previewRef.current) return;
    setGeneratingPreview(true);
    try {
      const url = await renderCompositionToImage(previewRef.current, {
        width: previewBoxWidth * 2,
        height: previewBoxHeight * 2,
        dpi: 96,
        format: 'png',
        backgroundColor: transparent ? '#0B1020' : '#0B1020',
      });
      setPreviewDataUrl(url);
    } catch { /* ignore */ }
    finally { setGeneratingPreview(false); }
  };

  useEffect(() => {
    if (open && showPreview) {
      const t = setTimeout(generatePreview, 300);
      return () => clearTimeout(t);
    }
  }, [open, showPreview, composition, preset, showGrid, showEventInfo, showHistogram, showLegend, format, transparent, dpi]);

  if (!open) return null;

  const handleExport = async () => {
    setExporting(true);
    setResult(null);
    try {
      await exportVisualization({
        format,
        scope,
        width: presetData.width,
        height: presetData.height,
        dpi,
        backgroundColor: transparent ? '#00000000' : '#050810',
        quality: 0.95,
        includeLegend: true,
        includeWatermark: false,
      });
      setResult(`导出成功: ${format.toUpperCase()} @ ${dpi} DPI, ${presetData.width}×${presetData.height}px`);
    } catch (e) {
      setResult(`导出失败: ${(e as Error).message}`);
    } finally {
      setExporting(false);
    }
    setTimeout(() => setResult(null), 4000);
  };

  const Formats: { v: ExportFormat; icon: any; name: string; desc: string }[] = [
    { v: 'png', icon: ImageIcon, name: 'PNG', desc: '位图无损，推荐期刊发表' },
    { v: 'svg', icon: FileImage, name: 'SVG', desc: '矢量图，任意缩放无损失' },
    { v: 'jpeg', icon: FileImage, name: 'JPEG', desc: '高压缩，文件体积小' },
    { v: 'pdf', icon: FileText, name: 'PDF', desc: '印刷级矢量，投稿首选' },
  ];

  const Scopes: { v: ExportScope; icon: any; name: string; desc: string }[] = [
    { v: 'main-view', icon: Monitor, name: '3D主视图', desc: '仅三维探测器视图' },
    { v: 'all-views', icon: Columns, name: '三视图+分析', desc: 'XY/RZ/3D + 直方图 (推荐)' },
    { v: 'analysis-only', icon: BarChart3, name: '仅分析图表', desc: '仅直方图和统计信息' },
    { v: 'workspace', icon: Maximize2, name: '完整工作台', desc: '整个界面截图' },
  ];

  const gridStyle = (() => {
    switch (comp.layout) {
      case 'grid-2x2':
        return `grid-cols-2 grid-rows-[1.4fr_1fr]`;
      case 'top-bottom':
        return `grid-cols-1 grid-rows-[1.8fr_1fr]`;
      case 'left-right':
        return `grid-cols-[1.7fr_1fr] grid-rows-1`;
      case 'single-large':
        return `grid-cols-1 grid-rows-1`;
      default:
        return `grid-cols-2 grid-rows-2`;
    }
  })();

  const particleTypeList: ParticleType[] = [
    'electron' as ParticleType, 'muon' as ParticleType,
    'photon' as ParticleType, 'jet' as ParticleType,
    'tau' as ParticleType, 'bquark' as ParticleType,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="w-[940px] max-h-[92vh] overflow-y-auto rounded-lg border border-[#2A3352] bg-[#0B1228] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1E2742] px-5 py-3 sticky top-0 bg-[#0B1228]/95 backdrop-blur z-10">
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4 text-emerald-400" />
            <span className="font-mono text-sm text-slate-100">论文级图像导出</span>
            {loadedFile && (
              <span className="ml-2 rounded border border-slate-700 bg-[#070B18] px-1.5 py-0.5 font-mono text-[9.5px] text-slate-400">
                {loadedFile} · {loadedFormat?.toUpperCase()}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-[#1A2340] hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-[360px_1fr] gap-4 p-5">
          <div className="space-y-4">
            <div className="rounded-lg border border-[#1E2742] bg-[#070B18] p-3 space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <LayoutDashboard className="h-3 w-3 text-amber-400" />
                排版模板
              </div>
              {(Object.keys(COMPOSITIONS) as CompositionMode[]).map(k => {
                const c = COMPOSITIONS[k];
                const Icon = c.icon;
                const active = composition === k;
                return (
                  <button
                    key={k}
                    onClick={() => setComposition(k)}
                    className={`w-full flex items-start gap-2 rounded-md border p-2.5 text-left transition-all ${
                      active
                        ? 'border-amber-400/70 bg-amber-400/10'
                        : 'border-[#2A3352] bg-[#0B1228] hover:border-slate-400/40'
                    }`}
                  >
                    <Icon className={`h-4 w-4 mt-0.5 ${active ? 'text-amber-300' : 'text-slate-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className={`font-mono text-[11.5px] ${active ? 'text-amber-200' : 'text-slate-200'}`}>
                        {c.name}
                      </div>
                      <div className="font-mono text-[9.5px] text-slate-500 mt-0.5 leading-tight">
                        {c.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-lg border border-[#1E2742] bg-[#070B18] p-3 space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400">文件格式</div>
              <div className="grid grid-cols-2 gap-1.5">
                {Formats.map(f => (
                  <button
                    key={f.v}
                    onClick={() => setFormat(f.v)}
                    className={`rounded-md border p-2 text-left transition-all ${
                      format === f.v
                        ? 'border-emerald-500/70 bg-emerald-500/15'
                        : 'border-[#2A3352] bg-[#070B18] hover:border-slate-400/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <f.icon className={`h-3.5 w-3.5 ${format === f.v ? 'text-emerald-300' : 'text-slate-400'}`} />
                      <span className={`font-mono text-xs font-bold ${format === f.v ? 'text-emerald-200' : 'text-slate-200'}`}>
                        {f.name}
                      </span>
                    </div>
                    <div className="font-mono text-[8.5px] leading-tight text-slate-500">{f.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-[#1E2742] bg-[#070B18] p-3 space-y-2.5">
              <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400">导出范围 & 尺寸</div>
              <div className="grid grid-cols-2 gap-1.5">
                {Scopes.map(s => (
                  <button
                    key={s.v}
                    onClick={() => setScope(s.v)}
                    className={`flex flex-col rounded-md border px-2 py-1.5 text-left transition-all ${
                      scope === s.v
                        ? 'border-cyan-500/70 bg-cyan-500/15 text-cyan-200'
                        : 'border-[#2A3352] bg-[#070B18] text-slate-300 hover:border-slate-400/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <s.icon className="h-3 w-3" />
                      <span className="font-mono text-[10.5px]">{s.name}</span>
                    </div>
                    <div className="font-mono text-[8.5px] text-slate-500 mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>

              <div>
                <select
                  value={preset}
                  onChange={e => setPreset(e.target.value)}
                  className="w-full rounded-md border border-[#2A3352] bg-[#0B1228] px-2 py-1.5 font-mono text-[10.5px] text-slate-200 outline-none focus:border-cyan-500/60"
                >
                  {Object.entries(PRESET_SIZES).map(([k, v]) => (
                    <option key={k} value={k}>{v.name} ({v.width}×{v.height})</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">分辨率</span>
                  <span className="font-mono text-[11px] text-amber-300">{dpi} DPI</span>
                </div>
                <input
                  type="range"
                  min={72}
                  max={600}
                  step={12}
                  value={dpi}
                  onChange={e => setDpi(parseInt(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#1E2742] accent-amber-500"
                />
                <div className="mt-0.5 flex justify-between font-mono text-[8.5px] text-slate-600">
                  <span>72 屏幕</span>
                  <span>150</span>
                  <span>300 印刷</span>
                  <span>600</span>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-[#2A3352] bg-[#0B1228] px-2 py-1.5 font-mono text-[10.5px] text-slate-300">
                <input
                  type="checkbox"
                  checked={transparent}
                  onChange={e => setTransparent(e.target.checked)}
                  className="h-3 w-3 accent-cyan-500"
                />
                透明背景（PNG/SVG，适合论文插图叠加）
              </label>
            </div>

            <div className="rounded-lg border border-[#1E2742] bg-[#070B18] p-3 space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Eye className="h-3 w-3 text-cyan-400" />
                排版元素
              </div>
              {([
                ['showEventInfo', '事件编号/统计信息', showEventInfo, setShowEventInfo],
                ['showHistogram', '不变质量直方图', showHistogram, setShowHistogram],
                ['showLegend', '粒子类型图例', showLegend, setShowLegend],
                ['showGrid', '辅助对齐网格', showGrid, setShowGrid],
              ] as const).map(([k, label, val, setter]) => (
                <label key={k} className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-[#2A3352] bg-[#0B1228] px-2 py-1.5 font-mono text-[10.5px] text-slate-300">
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={val}
                    onChange={e => setter(e.target.checked)}
                    className="h-3 w-3 accent-cyan-500"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Aperture className="h-3 w-3 text-fuchsia-400" />
                实时排版预览
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPreviewZoom(Math.max(0.2, previewZoom - 0.1))}
                  className="rounded border border-[#2A3352] bg-[#070B18] p-1 text-slate-400 hover:text-white"
                >
                  <ZoomOut className="h-3 w-3" />
                </button>
                <span className="font-mono text-[10px] text-slate-400 w-12 text-center">
                  {Math.round(previewZoom * 100)}%
                </span>
                <button
                  onClick={() => setPreviewZoom(Math.min(1.5, previewZoom + 0.1))}
                  className="rounded border border-[#2A3352] bg-[#070B18] p-1 text-slate-400 hover:text-white"
                >
                  <ZoomIn className="h-3 w-3" />
                </button>
                <button
                  onClick={generatePreview}
                  disabled={generatingPreview}
                  className="ml-2 rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 font-mono text-[10px] text-cyan-200 hover:bg-cyan-500/20"
                >
                  {generatingPreview
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <>刷新预览</>}
                </button>
                <button
                  onClick={() => setShowPreview(s => !s)}
                  className={`ml-1 rounded border px-2 py-1 font-mono text-[10px] ${
                    showPreview
                      ? 'border-amber-400/40 bg-amber-400/10 text-amber-200'
                      : 'border-slate-700 bg-[#070B18] text-slate-500'
                  }`}
                >
                  {showPreview ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                </button>
              </div>
            </div>

            <div
              className={`relative rounded-lg border ${showGrid ? 'border-dashed' : 'border-solid'} border-[#2A3352] bg-[#070B18] overflow-hidden`}
              style={{ aspectRatio: presetData.width / presetData.height }}
            >
              {showPreview ? (
                <div
                  ref={previewRef}
                  className={`absolute inset-2 grid gap-2 p-3 ${gridStyle} ${showGrid ? 'bg-[#0A1228]' : 'bg-[#050810]'}`}
                  style={{
                    background: transparent
                      ? 'linear-gradient(45deg, #0A1228 25%, transparent 25%), linear-gradient(-45deg, #0A1228 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #0A1228 75%), linear-gradient(-45deg, transparent 75%, #0A1228 75%)'
                      : undefined,
                    backgroundSize: showGrid ? '12px 12px' : undefined,
                    backgroundPosition: showGrid ? '0 0, 0 6px, 6px -6px, -6px 0px' : undefined,
                  }}
                >
                  <div
                    className="rounded-md border border-cyan-500/30 bg-[#0B1020] relative overflow-hidden flex items-center justify-center"
                    style={{
                      gridArea: comp.layout === 'grid-2x2'
                        ? '1 / 1 / 2 / 2'
                        : comp.layout === 'top-bottom'
                          ? '1 / 1 / 2 / -1'
                          : comp.layout === 'left-right'
                            ? '1 / 1 / -1 / 2'
                            : '1 / 1 / -1 / -1',
                    }}
                  >
                    <div className="absolute top-2 left-2 font-mono text-[10px] text-cyan-300 font-bold">
                      3D 探测器视图
                    </div>
                    <div className="font-mono text-[14px] text-slate-500">
                      [ 三维对撞事件渲染 ]
                    </div>
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[9px] font-mono text-slate-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
                      OpenGL 渲染
                    </div>
                  </div>

                  <div
                    className="rounded-md border border-amber-500/30 bg-[#0B1020] flex flex-col overflow-hidden"
                    style={{
                      gridArea: comp.layout === 'grid-2x2'
                        ? '1 / 2 / 2 / 3'
                        : undefined,
                      display: comp.layout !== 'grid-2x2' && comp.layout !== 'left-right' ? 'none' : undefined,
                    }}
                  >
                    <div className="px-2 py-1 border-b border-amber-500/20 font-mono text-[9.5px] text-amber-300">
                      横截面 XY (垂直束流)
                    </div>
                    <div className="flex-1 flex items-center justify-center text-[11px] font-mono text-slate-500">
                      ○ 同心探测器层
                    </div>
                  </div>

                  {showHistogram && activeHist && (
                    <div
                      className="rounded-md border border-emerald-500/30 bg-[#0B1020] overflow-hidden flex flex-col"
                      style={{
                        gridArea: comp.layout === 'grid-2x2'
                          ? '2 / 1 / 3 / 2'
                          : comp.layout === 'top-bottom'
                            ? '2 / 1 / 3 / 2'
                            : comp.layout === 'left-right'
                              ? '1 / 2 / 2 / -1'
                              : undefined,
                        display: comp.layout === 'grid-2x2' || comp.layout === 'top-bottom' || comp.layout === 'left-right' ? 'flex' : 'none',
                      }}
                    >
                      <div className="px-2 py-1 border-b border-emerald-500/20 flex items-center justify-between bg-[#0A1228]">
                        <span className="font-mono text-[9.5px] text-emerald-300">
                          {CHANNEL_LABELS[activeChannel].name} · 不变质量
                        </span>
                        <span className="font-mono text-[9px] text-slate-500">
                          Entries={activeHist.entries}
                        </span>
                      </div>
                      <div className="flex-1 px-2 pt-2 pb-1">
                        <div className="flex items-end gap-0.5 h-full">
                          {activeHist.bins.slice(0, 30).map((c, i) => (
                            <div
                              key={i}
                              className="flex-1 rounded-t"
                              style={{
                                height: `${Math.max(3, c * 100 / Math.max(1, ...activeHist.bins))}%`,
                                backgroundColor: CHANNEL_LABELS[activeChannel].color + 'AA',
                              }}
                            />
                          ))}
                        </div>
                        <div className="mt-0.5 font-mono text-[8px] text-slate-500 flex justify-between">
                          <span>{activeHist.xMin.toFixed(0)}</span>
                          <span>GeV/c²</span>
                          <span>{activeHist.xMax.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    className="rounded-md border border-fuchsia-500/30 bg-[#0B1020] overflow-hidden flex flex-col"
                    style={{
                      gridArea: comp.layout === 'grid-2x2'
                        ? '2 / 2 / 3 / 3'
                        : undefined,
                      display: comp.layout === 'grid-2x2' ? 'flex' : 'none',
                    }}
                  >
                    <div className="px-2 py-1 border-b border-fuchsia-500/20 font-mono text-[9.5px] text-fuchsia-300">
                      纵截面 RZ (沿束流)
                    </div>
                    <div className="flex-1 flex items-center justify-center text-[11px] font-mono text-slate-500">
                      ▢ 端盖 + 桶区
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-slate-600 font-mono text-xs">
                  <EyeOff className="h-4 w-4 mr-2" />
                  预览已关闭
                </div>
              )}

              {showEventInfo && (
                <div className="absolute top-2 left-2 rounded-md border border-slate-700/50 bg-black/50 backdrop-blur-sm px-2 py-1.5 font-mono space-y-0.5 text-[9.5px]">
                  <div className="text-slate-200">
                    <span className="text-slate-500">Event:</span>{' '}
                    <span className="text-cyan-300 font-bold">#{currentEvent?.eventId ?? '—'}</span>
                    <span className="text-slate-600 mx-1">/</span>
                    <span className="text-slate-400">{eventIndex + 1}/{totalEvents}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">ΣET:</span>{' '}
                    <span className="text-amber-300">{currentEvent?.totalET?.toFixed(0) ?? '—'} GeV</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Particles:</span>{' '}
                    <span className="text-emerald-300">{currentEvent?.particles.length ?? 0}</span>
                  </div>
                  {activePairCount > 0 && (
                    <div>
                      <span className="text-slate-500">Pairs:</span>{' '}
                      <span className="text-fuchsia-300">{activePairCount}</span>
                    </div>
                  )}
                </div>
              )}

              {showLegend && (
                <div className="absolute bottom-2 left-2 rounded-md border border-slate-700/50 bg-black/50 backdrop-blur-sm px-2 py-1.5 font-mono space-y-0.5 text-[9px] grid grid-cols-2 gap-x-3">
                  <div className="col-span-2 text-[8.5px] uppercase tracking-wider text-slate-500 mb-0.5 border-b border-slate-700/30 pb-0.5">
                    粒子图例
                  </div>
                  {particleTypeList.map(t => (
                    <div key={t} className="flex items-center gap-1 text-slate-300">
                      <span className="h-1.5 w-4 rounded" style={{ backgroundColor: PARTICLE_COLORS[t] }} />
                      <span style={{ color: PARTICLE_COLORS[t] }}>{PARTICLE_SYMBOLS[t]}</span>
                      <span className="text-slate-500 text-[8.5px]">{PARTICLE_NAMES[t]}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="absolute bottom-2 right-2 rounded-md border border-slate-700/50 bg-black/50 backdrop-blur-sm px-2 py-1 font-mono text-[8.5px] text-slate-400 text-right">
                <div className="text-slate-300 font-bold">
                  {comp.name}
                </div>
                <div>{presetData.name}</div>
                <div>{presetData.width}×{presetData.height} @ {dpi} DPI</div>
                <div className="text-emerald-400 mt-0.5">{format.toUpperCase()}</div>
              </div>
            </div>

            <div className="rounded-lg border border-[#1E2742] bg-[#070B18] p-3">
              <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                导出摘要
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[10.5px] text-slate-400">
                <div className="flex justify-between">
                  <span className="text-slate-500">格式:</span>
                  <span className="text-emerald-300">{format.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">分辨率:</span>
                  <span className="text-amber-300">{dpi} DPI</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">尺寸:</span>
                  <span className="text-cyan-300">{presetData.width}×{presetData.height} px</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">物理打印:</span>
                  <span className="text-slate-200">
                    {(presetData.width / dpi).toFixed(2)}×{(presetData.height / dpi).toFixed(2)} inch
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">排版:</span>
                  <span className="text-fuchsia-300">{comp.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">背景:</span>
                  <span className={transparent ? 'text-cyan-300' : 'text-slate-300'}>
                    {transparent ? '透明 (叠加用)' : '深色背景'}
                  </span>
                </div>
              </div>
            </div>

            {result && (
              <div className={`flex items-center gap-2 rounded border px-3 py-2 font-mono text-[11px] ${
                result.includes('成功')
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
              }`}>
                {result.includes('成功')
                  ? <CheckCircle2 className="h-3.5 w-3.5" />
                  : <X className="h-3.5 w-3.5" />}
                {result}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#1E2742] px-5 py-3 sticky bottom-0 bg-[#0B1228]/95 backdrop-blur">
          <button
            onClick={onClose}
            className="rounded-md border border-[#2A3352] bg-[#151D34] px-4 py-1.5 font-mono text-xs text-slate-300 hover:bg-[#1A2340] transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-emerald-500/90 to-cyan-500/90 px-5 py-1.5 font-mono text-xs text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-500 hover:to-cyan-500 transition-all disabled:opacity-60"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {exporting ? '正在导出 ...' : '下载高分辨率图像'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;
