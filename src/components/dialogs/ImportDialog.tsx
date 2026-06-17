import React, { useState, useRef, useEffect } from 'react';
import {
  Database, Upload, FileJson, FileSpreadsheet, Loader2, X, CheckCircle2,
  AlertTriangle, AlertCircle, Info, ChevronRight, ChevronDown, ArrowLeft,
  Wand2, Link2, RefreshCw, BarChart3, Eye, FileQuestion,
} from 'lucide-react';
import { useEventStore } from '@/store/eventStore';
import {
  probeFile, validateBranchMappings,
  DEFAULT_BRANCH_MAPPING, type FileFormat,
} from '@/services/io/fileParser';
import type {
  BranchMapping, EventBranchInfo, ParticleField,
  ParseValidationReport,
} from '@/types/physics';
import { REQUIRED_PARTICLE_FIELDS, RECOMMENDED_PARTICLE_FIELDS } from '@/types/physics';

type Step = 'source' | 'mapping' | 'validate' | 'loading' | 'done';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
}

const FIELD_LABEL: Record<ParticleField, string> = {
  px: 'pₓ (GeV/c)',
  py: 'pᵧ (GeV/c)',
  pz: 'p_z (GeV/c)',
  energy: 'E (GeV)',
  pt: 'p_T (GeV/c)',
  eta: 'η (赝快度)',
  phi: 'φ (方位角)',
  charge: '电荷 q',
  pdgId: 'PDG ID',
  mass: '质量 (GeV/c²)',
  vx: '顶点 X (cm)',
  vy: '顶点 Y (cm)',
  vz: '顶点 Z (cm)',
};

const FIELD_GROUP: { title: string; fields: ParticleField[]; required?: boolean }[] = [
  { title: '四维动量（必需）', fields: REQUIRED_PARTICLE_FIELDS, required: true },
  { title: '推荐字段', fields: RECOMMENDED_PARTICLE_FIELDS },
  { title: '顶点位置', fields: ['vx', 'vy', 'vz'] },
];

const SEVERITY_STYLE: Record<string, { border: string; bg: string; icon: any; label: string; text: string }> = {
  error: {
    border: 'border-rose-500/50', bg: 'bg-rose-500/10',
    icon: AlertCircle, label: '错误', text: 'text-rose-300',
  },
  warning: {
    border: 'border-amber-500/50', bg: 'bg-amber-500/10',
    icon: AlertTriangle, label: '警告', text: 'text-amber-300',
  },
  info: {
    border: 'border-cyan-500/50', bg: 'bg-cyan-500/10',
    icon: Info, label: '信息', text: 'text-cyan-300',
  },
};

const ImportDialog: React.FC<ImportDialogProps> = ({ open, onClose }) => {
  const loadMockData = useEventStore(s => s.loadMockData);
  const loadFromRealFile = useEventStore(s => s.loadFromRealFile);
  const currentFormat = useEventStore(s => s.loadedFormat);
  const isLoading = useEventStore(s => s.isLoading);

  const [step, setStep] = useState<Step>('source');
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [detectedFormat, setDetectedFormat] = useState<FileFormat | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const [branches, setBranches] = useState<EventBranchInfo[]>([]);
  const [mappings, setMappings] = useState<BranchMapping[]>(
    DEFAULT_BRANCH_MAPPING.map(m => ({ ...m, validated: false }))
  );
  const [report, setReport] = useState<ParseValidationReport | null>(null);
  const [expandBranchList, setExpandBranchList] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<Partial<Record<ParticleField, any[]>>>({});
  const [nParticlesPerEvent, setNParticlesPerEvent] = useState<number[]>([]);
  const [probedFile, setProbedFile] = useState<File | null>(null);
  const [rawBranchData, setRawBranchData] = useState<Record<string, any[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('source');
        setFileName('');
        setDetectedFormat(null);
        setBranches([]);
        setMappings(DEFAULT_BRANCH_MAPPING.map(m => ({ ...m, validated: false })));
        setReport(null);
        setProgress(0);
      }, 200);
    }
  }, [open]);

  if (!open) return null;

  const probeAndGo = async (file: File) => {
    setFileName(file.name);
    setStatusMsg(`正在探测 ${file.name}（读取前 5 个事件用于预览校验）...`);
    setProbedFile(file);
    try {
      const r = await probeFile(file);
      setDetectedFormat(r.format);
      setEventCount(r.eventCount);
      setBranches(r.branches);
      setMappings(r.mappings);
      setPreviewData(r.preview);
      setNParticlesPerEvent(r.nParticlesPerEvent);
      setRawBranchData(r.rawData.data);
      setStep('mapping');
      setStatusMsg(null);
    } catch (e) {
      setStatusMsg(`探测失败: ${(e as Error).message}`);
      setTimeout(() => setStatusMsg(null), 8000);
    }
  };

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['root', 'h5', 'hdf5', 'hepmc'].includes(ext || '')) {
      setStatusMsg('不支持的文件格式，请选择 .root 或 .h5/.hdf5 文件');
      setTimeout(() => setStatusMsg(null), 4000);
      return;
    }
    await probeAndGo(file);
  };

  const handleMock = async () => {
    setStatusMsg('正在生成模拟事件数据 (H→ZZ*, Z→μμ, tt̄, QCD)...');
    try {
      await loadMockData();
      setStatusMsg('已加载 50 个模拟对撞事件');
      setTimeout(() => { setStatusMsg(null); onClose(); }, 1500);
    } catch (e) {
      setStatusMsg(`生成失败: ${(e as Error).message}`);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const handleUpdateMapping = (field: ParticleField, branchName: string | null) => {
    setMappings(prev => {
      const next = prev.map(m =>
        m.particleField === field
          ? { ...m, branchName, validated: !!branchName }
          : m
      );
      const newPreview: Partial<Record<ParticleField, any[]>> = { ...previewData };
      const nRead = nParticlesPerEvent.length;
      if (branchName) {
        const col = rawBranchData[branchName];
        if (col && Array.isArray(col)) {
          const arr: any[] = [];
          for (let ev = 0; ev < nRead; ev++) {
            const v = col[ev];
            if (Array.isArray(v)) arr.push([...v]);
            else arr.push(v);
          }
          newPreview[field] = arr;
        } else {
          delete newPreview[field];
        }
      } else {
        delete newPreview[field];
      }
      setPreviewData(newPreview);
      const r = validateBranchMappings(next, branches, newPreview, nParticlesPerEvent);
      setReport(r);
      return next;
    });
  };

  const handleAutoMap = () => {
    setMappings(prev => prev.map(m => {
      if (m.branchName) return m;
      const found = branches.find(b => {
        const key = (m.particleField as string).toLowerCase();
        const n = b.name.toLowerCase();
        return n.includes(key) ||
          n.endsWith('_' + key) || n.endsWith('.' + key) ||
          n.includes(key.replace(/[^a-z]/g, ''));
      });
      return found ? { ...m, branchName: found.name, validated: true } : m;
    }));
  };

  const goValidate = () => {
    const r = validateBranchMappings(mappings, branches, previewData, nParticlesPerEvent);
    setReport(r);
    setStep('validate');
  };

  const doImport = async () => {
    const fileToLoad = probedFile || fileInputRef.current?.files?.[0];
    if (!fileToLoad) {
      setStatusMsg('请先重新选择文件（浏览器限制无法保留文件句柄）');
      setStep('source');
      return;
    }
    setStep('loading');
    setProgress(0);
    try {
      await loadFromRealFile(fileToLoad, mappings, Number.MAX_SAFE_INTEGER, (d, t) => setProgress(Math.round(d * 100 / t)));
      setStep('done');
      setTimeout(() => { onClose(); }, 1500);
    } catch (e) {
      setStatusMsg(`导入失败: ${(e as Error).message}`);
      setStep('validate');
    }
  };

  const stepLabels: Record<Step, string> = {
    source: '① 选择数据源',
    mapping: '② 分支字段映射',
    validate: '③ 校验与确认',
    loading: '④ 导入中',
    done: '✓ 完成',
  };
  const stepOrder: Step[] = ['source', 'mapping', 'validate', 'loading'];
  const currentStepIdx = stepOrder.indexOf(step === 'done' ? 'loading' : step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[720px] max-h-[86vh] overflow-y-auto rounded-lg border border-[#2A3352] bg-[#0B1228] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1E2742] px-4 py-3 sticky top-0 bg-[#0B1228]/95 backdrop-blur z-10">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-cyan-400" />
            <span className="font-mono text-sm text-slate-100">导入事件数据</span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-[#1A2340] hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[#1E2742] flex items-center gap-1">
          {stepOrder.map((s, i) => {
            const active = i <= currentStepIdx;
            const current = i === currentStepIdx;
            return (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10.5px] font-mono transition-all ${
                  current ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                    : active ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  {active ? <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    : <div className="h-3 w-3 rounded-full border border-slate-600" />}
                  {stepLabels[s].replace(/^[①②③④]/, '').trim()}
                </div>
                {i < stepOrder.length - 1 && <ChevronRight className="h-3 w-3 text-slate-600" />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="space-y-4 p-5">

          {step === 'source' && (
            <>
              <button
                onClick={handleMock}
                disabled={isLoading}
                className="group w-full rounded-lg border-2 border-dashed border-cyan-500/30 bg-cyan-500/5 px-5 py-4 text-left transition-all hover:border-cyan-400/60 hover:bg-cyan-500/10 disabled:opacity-60"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/20 group-hover:bg-cyan-500/30 transition-colors">
                    {isLoading ? <Loader2 className="h-6 w-6 text-cyan-300 animate-spin" /> : <FileJson className="h-6 w-6 text-cyan-300" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-mono text-sm text-cyan-200">加载示例模拟数据</div>
                    <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                      50个预生成事件：包含 H→ZZ*→4l、Z→ll、tt̄、双喷注、QCD 等物理过程
                      {currentFormat === 'mock' && <span className="ml-2 text-emerald-400">（已加载）</span>}
                    </div>
                  </div>
                  <div className="font-mono text-[10px] text-cyan-400/80">快速开始</div>
                </div>
              </button>

              <div className="relative flex items-center py-1">
                <div className="h-px flex-1 bg-[#1E2742]" />
                <span className="mx-3 font-mono text-[10.5px] uppercase tracking-wider text-slate-500">或 从真实文件导入</span>
                <div className="h-px flex-1 bg-[#1E2742]" />
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-lg border-2 border-dashed px-5 py-8 text-center transition-all ${
                  dragOver
                    ? 'border-amber-400/70 bg-amber-400/10'
                    : 'border-[#2A3352] bg-[#070B18] hover:border-slate-400/50 hover:bg-[#0A1228]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".root,.h5,.hdf5,.hepmc"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
                <Upload className={`mx-auto mb-2 h-9 w-9 ${dragOver ? 'text-amber-300' : 'text-slate-500'}`} />
                <div className="font-mono text-sm text-slate-300">
                  {fileName || '点击选择 ROOT / HDF5 文件，或拖放到此处'}
                </div>
                <div className="mt-1 font-mono text-[10.5px] text-slate-500">
                  支持格式：<span className="text-amber-300">.root</span>（CERN ROOT TTree）
                  &nbsp;·&nbsp; <span className="text-fuchsia-300">.h5 .hdf5</span>（HDF5/HepMC）
                </div>
                {detectedFormat && (
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10.5px] text-emerald-300">
                    <FileSpreadsheet className="h-3 w-3" />
                    检测为 {detectedFormat.toUpperCase()} 格式，共 {eventCount} 个事件 / {branches.length} 个分支
                  </div>
                )}
              </div>
            </>
          )}

          {step === 'mapping' && (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-sm text-slate-200">字段映射配置</div>
                  <div className="font-mono text-[10.5px] text-slate-500">
                    <span className="text-slate-300">{fileName}</span> ·
                    &nbsp;{detectedFormat?.toUpperCase()} · {eventCount} 事件 · {branches.length} 分支
                  </div>
                </div>
                <button
                  onClick={handleAutoMap}
                  className="flex items-center gap-1 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1.5 font-mono text-[10.5px] text-cyan-300 hover:bg-cyan-500/20 transition-colors"
                >
                  <Wand2 className="h-3 w-3" /> 智能匹配剩余
                </button>
              </div>

              <div className="space-y-3">
                {FIELD_GROUP.map(g => (
                  <div key={g.title} className="rounded-lg border border-[#1E2742] bg-[#070B18] overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1E2742] bg-[#0A1228]">
                      {g.required && <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">必需</span>}
                      <span className="font-mono text-[11px] text-slate-300">{g.title}</span>
                    </div>
                    <div className="divide-y divide-[#1A2340]">
                      {g.fields.map(f => {
                        const m = mappings.find(mm => mm.particleField === f)!;
                        return (
                          <div key={f} className="grid grid-cols-[180px_1fr_40px] items-center gap-3 px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <Link2 className="h-3 w-3 text-slate-500" />
                              <span className="font-mono text-[11px] text-slate-300">{FIELD_LABEL[f]}</span>
                              <span className="font-mono text-[9.5px] text-slate-600">({f})</span>
                            </div>
                            <select
                              value={m.branchName || ''}
                              onChange={(e) => handleUpdateMapping(f, e.target.value || null)}
                              className={`w-full rounded-md border bg-[#0B1228] px-2 py-1.5 font-mono text-[11px] outline-none transition-colors ${
                                m.validated
                                  ? 'border-emerald-500/40 text-emerald-200 focus:border-emerald-500'
                                  : g.required
                                    ? 'border-rose-500/30 text-slate-300 focus:border-rose-500/60'
                                    : 'border-[#2A3352] text-slate-300 focus:border-cyan-500/60'
                              }`}
                            >
                              <option value="">-- 不映射 / 使用默认推导 --</option>
                              {branches.map(b => (
                                <option key={b.name} value={b.name}>
                                  {b.name}  [{b.type}]  {b.dtype}
                                </option>
                              ))}
                            </select>
                            {m.validated
                              ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                              : g.required
                                ? <AlertCircle className="h-4 w-4 text-rose-400/70" />
                                : <span className="font-mono text-[9.5px] text-slate-600">可选</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <details open={expandBranchList} className="rounded-lg border border-[#1E2742] bg-[#070B18]">
                <summary
                  onClick={() => setExpandBranchList(s => !s)}
                  className="flex items-center gap-1.5 px-3 py-2 cursor-pointer font-mono text-[11px] text-slate-400 hover:text-slate-300"
                >
                  {expandBranchList ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  <Eye className="h-3 w-3" /> 查看文件全部 {branches.length} 个分支
                </summary>
                <div className="max-h-48 overflow-y-auto border-t border-[#1E2742] px-2 py-1 font-mono text-[10px] space-y-0.5">
                  {branches.map(b => (
                    <div key={b.name} className="flex justify-between px-2 py-1 rounded hover:bg-[#0A1228]">
                      <span className="text-cyan-300/90">{b.name}</span>
                      <span className="text-slate-500">{b.type} · {b.dtype}</span>
                    </div>
                  ))}
                </div>
              </details>
            </>
          )}

          {step === 'validate' && report && (
            <>
              <div className="rounded-lg border border-[#1E2742] bg-[#070B18] px-3 py-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800">
                    <BarChart3 className={`h-5 w-5 ${report.ok ? 'text-emerald-400' : 'text-rose-400'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="font-mono text-[12px] text-slate-200">
                      {report.ok ? '校验通过，可以导入' : '发现问题，请检查后重试'}
                    </div>
                    <div className="font-mono text-[10.5px] text-slate-500">
                      文件：{fileName} · 格式：{detectedFormat?.toUpperCase()} · 预计 {eventCount} 个事件
                    </div>
                  </div>
                  <div className={`text-center rounded-md px-2 py-1 ${report.ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                    <div className="font-mono text-[16px] font-bold">{report.ok ? 'OK' : '⚠'}</div>
                    <div className="font-mono text-[9px]">{report.errors.length} 条提示</div>
                  </div>
                </div>
              </div>

              {report.errors.length > 0 ? (
                <div className="space-y-1.5">
                  {report.errors.map((e, i) => {
                    const st = SEVERITY_STYLE[e.severity];
                    const Icon = st.icon;
                    return (
                      <div key={i} className={`flex items-start gap-2 rounded-md border ${st.border} ${st.bg} px-3 py-2`}>
                        <Icon className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${st.text}`} />
                        <div className="flex-1">
                          <div className={`font-mono text-[11px] ${st.text}`}>
                            <span className="opacity-60">[{st.label}]</span> {e.message}
                          </div>
                          {e.field && (
                            <div className="font-mono text-[9.5px] text-slate-500 mt-0.5">
                              关联字段：<span className="text-cyan-400">{FIELD_LABEL[e.field]}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="font-mono text-[11.5px] text-emerald-200">所有必需字段均已正确映射，格式校验通过</span>
                </div>
              )}

              <div className="rounded-lg border border-[#1E2742] bg-[#070B18] px-3 py-2">
                <div className="font-mono text-[11px] text-slate-300 mb-1">导入预览（前 3 个字段映射）</div>
                <div className="grid grid-cols-3 gap-2 font-mono text-[10px] text-slate-500">
                  {mappings.filter(m => m.branchName).slice(0, 6).map(m => (
                    <div key={m.particleField} className="rounded border border-[#1E2742] bg-[#0B1228] px-2 py-1">
                      <div className="text-cyan-300">{FIELD_LABEL[m.particleField]}</div>
                      <div className="truncate text-slate-400">{m.branchName}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 'loading' && (
            <>
              <div className="flex flex-col items-center py-8 gap-3">
                <RefreshCw className="h-10 w-10 text-cyan-400 animate-spin" />
                <div className="font-mono text-sm text-slate-200">正在导入 {fileName} ...</div>
                <div className="w-full max-w-md h-3 rounded-full bg-[#1E2742] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="font-mono text-[11px] text-slate-500">
                  {progress}% · 正在生成 {eventCount} 个事件的粒子径迹与能量沉积 ...
                </div>
              </div>
            </>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-400" />
              <div className="font-mono text-base text-emerald-200">数据导入完成！</div>
              <div className="font-mono text-[11px] text-slate-400">即将关闭对话框 ...</div>
            </div>
          )}

          {statusMsg && (
            <div className={`flex items-center gap-2 rounded border px-3 py-2 font-mono text-[11px] ${
              statusMsg.includes('成功') || statusMsg.includes('已加载') || statusMsg.includes('OK')
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : statusMsg.includes('失败')
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
            }`}>
              {statusMsg.includes('成功') || statusMsg.includes('已加载')
                ? <CheckCircle2 className="h-3.5 w-3.5" />
                : statusMsg.includes('失败')
                ? <X className="h-3.5 w-3.5" />
                : statusMsg.includes('探测') || statusMsg.includes('生成') || statusMsg.includes('加载')
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <FileQuestion className="h-3.5 w-3.5" />}
              {statusMsg}
            </div>
          )}
        </div>

        <div className="flex justify-between gap-2 border-t border-[#1E2742] px-5 py-3 sticky bottom-0 bg-[#0B1228]/95 backdrop-blur">
          <div>
            {step === 'mapping' && (
              <button
                onClick={() => setStep('source')}
                className="flex items-center gap-1 rounded-md border border-[#2A3352] bg-[#151D34] px-3 py-1.5 font-mono text-xs text-slate-300 hover:bg-[#1A2340] transition-colors"
              >
                <ArrowLeft className="h-3 w-3" /> 返回
              </button>
            )}
            {step === 'validate' && (
              <button
                onClick={() => setStep('mapping')}
                className="flex items-center gap-1 rounded-md border border-[#2A3352] bg-[#151D34] px-3 py-1.5 font-mono text-xs text-slate-300 hover:bg-[#1A2340] transition-colors"
              >
                <ArrowLeft className="h-3 w-3" /> 修改映射
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-md border border-[#2A3352] bg-[#151D34] px-4 py-1.5 font-mono text-xs text-slate-300 hover:bg-[#1A2340] transition-colors"
            >
              取消
            </button>
            {step === 'mapping' && (
              <button
                onClick={goValidate}
                disabled={mappings.filter(m => REQUIRED_PARTICLE_FIELDS.includes(m.particleField)).some(m => !m.branchName)}
                className="flex items-center gap-1.5 rounded-md bg-cyan-500/80 px-4 py-1.5 font-mono text-xs text-white hover:bg-cyan-500 transition-colors disabled:opacity-50"
              >
                下一步：校验
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
            {step === 'validate' && (
              <button
                onClick={doImport}
                disabled={!report?.ok || isLoading}
                className="flex items-center gap-1.5 rounded-md bg-emerald-500/80 px-4 py-1.5 font-mono text-xs text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                确认导入数据
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportDialog;
