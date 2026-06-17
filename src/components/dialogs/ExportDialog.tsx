import React, { useState } from 'react';
import {
  Download, Image as ImageIcon, FileImage, FileText, Loader2, X, CheckCircle2,
  Monitor, Maximize2, Columns, BarChart3,
} from 'lucide-react';
import {
  exportVisualization,
  PRESET_SIZES,
  type ExportFormat,
  type ExportScope,
} from '@/services/export/imageExporter';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

const ExportDialog: React.FC<ExportDialogProps> = ({ open, onClose }) => {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [scope, setScope] = useState<ExportScope>('main-view');
  const [preset, setPreset] = useState<string>('fig-slide-16-9');
  const [dpi, setDpi] = useState<number>(300);
  const [transparent, setTransparent] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  if (!open) return null;

  const presetData = PRESET_SIZES[preset] || PRESET_SIZES['fig-slide-16-9'];

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
    { v: 'png', icon: ImageIcon, name: 'PNG', desc: '位图无损压缩，推荐发布用' },
    { v: 'svg', icon: FileImage, name: 'SVG', desc: '矢量图，任意缩放无损失' },
    { v: 'jpeg', icon: FileImage, name: 'JPEG', desc: '高压缩率，文件较小' },
    { v: 'pdf', icon: FileText, name: 'PDF', desc: '印刷标准格式' },
  ];

  const Scopes: { v: ExportScope; icon: any; name: string }[] = [
    { v: 'main-view', icon: Monitor, name: '3D主视图' },
    { v: 'all-views', icon: Columns, name: '三视图合成' },
    { v: 'analysis-only', icon: BarChart3, name: '仅分析图表' },
    { v: 'workspace', icon: Maximize2, name: '完整工作台' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[540px] rounded-lg border border-[#2A3352] bg-[#0B1228] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1E2742] px-4 py-3">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-emerald-400" />
            <span className="font-mono text-sm text-slate-100">导出高分辨率图像</span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-[#1A2340] hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <div className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-400">文件格式</div>
            <div className="grid grid-cols-4 gap-1.5">
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

          <div>
            <div className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-400">导出范围</div>
            <div className="grid grid-cols-2 gap-1.5">
              {Scopes.map(s => (
                <button
                  key={s.v}
                  onClick={() => setScope(s.v)}
                  className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition-all ${
                    scope === s.v
                      ? 'border-cyan-500/70 bg-cyan-500/15 text-cyan-200'
                      : 'border-[#2A3352] bg-[#070B18] text-slate-300 hover:border-slate-400/50'
                  }`}
                >
                  <s.icon className="h-3.5 w-3.5" />
                  <span className="font-mono text-[11px]">{s.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-400">尺寸预设</div>
              <select
                value={preset}
                onChange={e => setPreset(e.target.value)}
                className="w-full rounded-md border border-[#2A3352] bg-[#070B18] px-2 py-1.5 font-mono text-[11px] text-slate-200 outline-none focus:border-cyan-500/60"
              >
                {Object.entries(PRESET_SIZES).map(([k, v]) => (
                  <option key={k} value={k}>{v.name}</option>
                ))}
              </select>
              <div className="mt-1 font-mono text-[9.5px] text-slate-500 text-right">
                {presetData.width} × {presetData.height} px
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">分辨率</span>
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
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-[#2A3352] bg-[#070B18] px-2.5 py-2 font-mono text-[11px] text-slate-300">
            <input
              type="checkbox"
              checked={transparent}
              onChange={e => setTransparent(e.target.checked)}
              className="h-3 w-3 accent-cyan-500"
            />
            透明背景（仅 SVG / PNG 有效，适合论文插图嵌入）
          </label>

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

        <div className="flex justify-end gap-2 border-t border-[#1E2742] px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-md border border-[#2A3352] bg-[#151D34] px-4 py-1.5 font-mono text-xs text-slate-300 hover:bg-[#1A2340] transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-md bg-emerald-500/80 px-4 py-1.5 font-mono text-xs text-white hover:bg-emerald-500 transition-colors disabled:opacity-60"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            导出图像
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;
