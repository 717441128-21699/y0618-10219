import React, { useState, useRef } from 'react';
import {
  Database, Upload, FileJson, FileSpreadsheet, Loader2, X, CheckCircle2,
} from 'lucide-react';
import { useEventStore } from '@/store/eventStore';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
}

const ImportDialog: React.FC<ImportDialogProps> = ({ open, onClose }) => {
  const loadMockData = useEventStore(s => s.loadMockData);
  const loadFromROOT = useEventStore(s => s.loadFromROOT);
  const loadFromHDF5 = useEventStore(s => s.loadFromHDF5);
  const currentFormat = useEventStore(s => s.loadedFormat);
  const isLoading = useEventStore(s => s.isLoading);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [format, setFormat] = useState<'root' | 'hdf5' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!open) return null;

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'root') {
      setFormat('root');
      setStatusMsg('正在解析 ROOT 文件...');
      try {
        await loadFromROOT(file);
        setStatusMsg(`成功加载 ROOT 数据: ${file.name}`);
      } catch (e) {
        setStatusMsg(`加载失败: ${(e as Error).message}`);
      }
    } else if (ext === 'h5' || ext === 'hdf5' || ext === 'hepmc') {
      setFormat('hdf5');
      setStatusMsg('正在解析 HDF5 文件...');
      try {
        await loadFromHDF5(file);
        setStatusMsg(`成功加载 HDF5 数据: ${file.name}`);
      } catch (e) {
        setStatusMsg(`加载失败: ${(e as Error).message}`);
      }
    } else {
      setFormat(null);
      setStatusMsg('不支持的文件格式，请选择 .root 或 .h5/.hdf5 文件');
    }
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleMock = async () => {
    setStatusMsg('正在生成模拟事件数据 (H→ZZ*, Z→μμ, tt̄, QCD)...');
    try {
      await loadMockData();
      setStatusMsg('已加载 50 个模拟对撞事件');
    } catch (e) {
      setStatusMsg(`生成失败: ${(e as Error).message}`);
    }
    setTimeout(() => { setStatusMsg(null); onClose(); }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[560px] rounded-lg border border-[#2A3352] bg-[#0B1228] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1E2742] px-4 py-3">
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

        <div className="space-y-4 p-5">
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
              <div className="font-mono text-[10px] text-cyan-400/80">推荐</div>
            </div>
          </button>

          <div className="relative flex items-center py-1">
            <div className="h-px flex-1 bg-[#1E2742]" />
            <span className="mx-3 font-mono text-[10.5px] uppercase tracking-wider text-slate-500">或</span>
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
            className={`cursor-pointer rounded-lg border-2 border-dashed px-5 py-6 text-center transition-all ${
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
            <Upload className={`mx-auto mb-2 h-8 w-8 ${dragOver ? 'text-amber-300' : 'text-slate-500'}`} />
            <div className="font-mono text-sm text-slate-300">
              {fileName || '点击选择文件，或拖放到此处'}
            </div>
            <div className="mt-1 font-mono text-[10.5px] text-slate-500">
              支持格式：<span className="text-amber-300">.root</span>（CERN ROOT TTree） /
              <span className="text-fuchsia-300"> .h5 .hdf5</span>（HDF5）
            </div>
            {format && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10.5px] text-emerald-300">
                <FileSpreadsheet className="h-3 w-3" />
                检测为 {format.toUpperCase()} 格式
              </div>
            )}
          </div>

          <div className="rounded border border-[#1E2742] bg-[#070B18] px-3 py-2 font-mono text-[10.5px] space-y-1">
            <div className="text-slate-400">数据分支映射约定：</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-slate-500">
              <div><span className="text-cyan-400">px/py/pz</span> 动量分量 [GeV/c]</div>
              <div><span className="text-cyan-400">energy</span> 能量 [GeV]</div>
              <div><span className="text-cyan-400">eta/phi</span> 赝快度/方位角</div>
              <div><span className="text-cyan-400">pdgID</span> 粒子 PDG 编码</div>
              <div><span className="text-cyan-400">charge</span> 电荷</div>
              <div><span className="text-cyan-400">pt</span> 横动量 [GeV/c]</div>
            </div>
          </div>

          {statusMsg && (
            <div className={`flex items-center gap-2 rounded border px-3 py-2 font-mono text-[11px] ${
              statusMsg.includes('成功') || statusMsg.includes('已加载')
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : statusMsg.includes('失败')
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
            }`}>
              {statusMsg.includes('成功') || statusMsg.includes('已加载')
                ? <CheckCircle2 className="h-3.5 w-3.5" />
                : <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {statusMsg}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#1E2742] px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-md border border-[#2A3352] bg-[#151D34] px-4 py-1.5 font-mono text-xs text-slate-300 hover:bg-[#1A2340] transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportDialog;
