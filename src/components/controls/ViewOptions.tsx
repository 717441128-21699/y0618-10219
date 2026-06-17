import React from 'react';
import { Layers, Eye, Grid, Axis3d, Target, Flame, RefreshCcw, Palette } from 'lucide-react';
import { useViewStore } from '@/store/viewStore';

const ViewOptions: React.FC = () => {
  const showEnergyHeatmap = useViewStore(s => s.showEnergyHeatmap);
  const heatmapOpacity = useViewStore(s => s.heatmapOpacity);
  const showDetectorGeometry = useViewStore(s => s.showDetectorGeometry);
  const detectorOpacity = useViewStore(s => s.detectorOpacity);
  const showGrid = useViewStore(s => s.showGrid);
  const showAxes = useViewStore(s => s.showAxes);
  const showTrackPoints = useViewStore(s => s.showTrackPoints);
  const showMissingET = useViewStore(s => s.showMissingET);
  const syncViews = useViewStore(s => s.syncViews);

  const setShowEnergyHeatmap = useViewStore(s => s.setShowEnergyHeatmap);
  const setHeatmapOpacity = useViewStore(s => s.setHeatmapOpacity);
  const setShowDetectorGeometry = useViewStore(s => s.setShowDetectorGeometry);
  const setDetectorOpacity = useViewStore(s => s.setDetectorOpacity);
  const setShowGrid = useViewStore(s => s.setShowGrid);
  const setShowAxes = useViewStore(s => s.setShowAxes);
  const setShowTrackPoints = useViewStore(s => s.setShowTrackPoints);
  const setShowMissingET = useViewStore(s => s.setShowMissingET);
  const setSyncViews = useViewStore(s => s.setSyncViews);

  const Toggle = ({ label, icon: Icon, value, onChange, color }: {
    label: string; icon: any; value: boolean; onChange: (v: boolean) => void; color: string;
  }) => (
    <button
      onClick={() => onChange(!value)}
      className={`flex w-full items-center justify-between rounded border px-2 py-1.5 text-[10.5px] font-mono transition-colors ${
        value
          ? `border-${color}-500/50 bg-${color}-500/10 text-${color}-300`
          : 'border-[#1E2742] bg-[#070B18] text-slate-400 hover:text-slate-200'
      }`}
      style={value ? {
        borderColor: `var(--tw-${color}, ${color})`,
        backgroundColor: `var(--tw-${color}-bg, ${color})`,
      } : {}}
    >
      <span className="flex items-center gap-1.5">
        <Icon className="h-3 w-3" style={value ? { color: color.replace('#', '') } : {}} />
        {label}
      </span>
      <div className={`h-3 w-6 rounded-full transition-colors ${
        value ? 'bg-opacity-60' : 'bg-[#1E2742]'
      }`}
        style={value ? { backgroundColor: color + '99' } : {}}
      >
        <div className={`h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${
          value ? 'translate-x-3' : 'translate-x-0.5'
        }`} />
      </div>
    </button>
  );

  return (
    <div className="space-y-3 rounded-md border border-[#2A3352] bg-[#0D1528] p-3">
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-slate-300">
        <Layers className="h-3.5 w-3.5 text-emerald-400" />
        显示选项
      </div>

      <div className="space-y-1.5">
        <Toggle
          label="探测器几何体"
          icon={Eye}
          value={showDetectorGeometry}
          onChange={setShowDetectorGeometry}
          color="#00BBF9"
        />
        <Toggle
          label="能量热力图"
          icon={Flame}
          value={showEnergyHeatmap}
          onChange={setShowEnergyHeatmap}
          color="#FF6D00"
        />
        <Toggle
          label="丢失能量 MET"
          icon={Target}
          value={showMissingET}
          onChange={setShowMissingET}
          color="#FF1744"
        />
        <Toggle
          label="坐标轴"
          icon={Axis3d}
          value={showAxes}
          onChange={setShowAxes}
          color="#00FF88"
        />
        <Toggle
          label="网格参考线"
          icon={Grid}
          value={showGrid}
          onChange={setShowGrid}
          color="#64748B"
        />
        <Toggle
          label="径迹点标记"
          icon={Palette}
          value={showTrackPoints}
          onChange={setShowTrackPoints}
          color="#00D4FF"
        />
        <Toggle
          label="三视图联动"
          icon={RefreshCcw}
          value={syncViews}
          onChange={setSyncViews}
          color="#B388FF"
        />
      </div>

      <div className="space-y-2 border-t border-[#1E2742] pt-2.5">
        <div>
          <div className="flex items-center justify-between text-[10.5px] font-mono">
            <span className="text-slate-400">探测器不透明度</span>
            <span className="text-cyan-300">{(detectorOpacity * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={detectorOpacity}
            onChange={e => setDetectorOpacity(parseFloat(e.target.value))}
            className="mt-1 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#1E2742] accent-sky-500"
          />
        </div>
        <div>
          <div className="flex items-center justify-between text-[10.5px] font-mono">
            <span className="text-slate-400">热力图不透明度</span>
            <span className="text-orange-300">{(heatmapOpacity * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={heatmapOpacity}
            onChange={e => setHeatmapOpacity(parseFloat(e.target.value))}
            className="mt-1 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#1E2742] accent-orange-500"
          />
        </div>
      </div>

      <div className="space-y-1 border-t border-[#1E2742] pt-2.5">
        <div className="text-[10px] font-mono text-slate-400 mb-1.5">色带图例</div>
        <div className="h-3 w-full rounded bg-gradient-to-r from-[#000033] via-[#0099FF] via-[#66FFFF] via-[#CCFF66] via-[#FFFF00] via-[#FF9900] to-[#CC0000]" />
        <div className="mt-0.5 flex justify-between font-mono text-[8.5px] text-slate-500">
          <span>低</span>
          <span>能量沉积</span>
          <span>高</span>
        </div>
      </div>
    </div>
  );
};

export default ViewOptions;
