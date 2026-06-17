import { create } from 'zustand';

interface ViewState {
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  bottomPanelCollapsed: boolean;
  leftPanelWidth: number;
  rightPanelWidth: number;
  bottomPanelHeight: number;
  showEnergyHeatmap: boolean;
  heatmapOpacity: number;
  showDetectorGeometry: boolean;
  detectorOpacity: number;
  selectedParticleIds: Set<number>;
  syncViews: boolean;
  showGrid: boolean;
  showAxes: boolean;
  showTrackPoints: boolean;
  showMissingET: boolean;
  backgroundColor: string;
  togglePanel: (panel: 'left' | 'right' | 'bottom') => void;
  setPanelSize: (panel: 'left' | 'right' | 'bottom', size: number) => void;
  toggleParticleSelection: (id: number) => void;
  selectParticleRange: (ids: number[]) => void;
  isParticleSelected: (id: number) => boolean;
  clearSelection: () => void;
  setShowEnergyHeatmap: (v: boolean) => void;
  setHeatmapOpacity: (v: number) => void;
  setShowDetectorGeometry: (v: boolean) => void;
  setDetectorOpacity: (v: number) => void;
  setSyncViews: (v: boolean) => void;
  setShowGrid: (v: boolean) => void;
  setShowAxes: (v: boolean) => void;
  setShowTrackPoints: (v: boolean) => void;
  setShowMissingET: (v: boolean) => void;
}

export const useViewStore = create<ViewState>((set, get) => ({
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  bottomPanelCollapsed: false,
  leftPanelWidth: 320,
  rightPanelWidth: 360,
  bottomPanelHeight: 280,
  showEnergyHeatmap: true,
  heatmapOpacity: 0.6,
  showDetectorGeometry: true,
  detectorOpacity: 0.12,
  selectedParticleIds: new Set<number>(),
  syncViews: true,
  showGrid: false,
  showAxes: true,
  showTrackPoints: false,
  showMissingET: true,
  backgroundColor: '#050810',

  togglePanel: (panel) => {
    switch (panel) {
      case 'left':
        set({ leftPanelCollapsed: !get().leftPanelCollapsed });
        break;
      case 'right':
        set({ rightPanelCollapsed: !get().rightPanelCollapsed });
        break;
      case 'bottom':
        set({ bottomPanelCollapsed: !get().bottomPanelCollapsed });
        break;
    }
  },

  setPanelSize: (panel, size) => {
    switch (panel) {
      case 'left':
        set({ leftPanelWidth: Math.max(200, Math.min(600, size)) });
        break;
      case 'right':
        set({ rightPanelWidth: Math.max(240, Math.min(700, size)) });
        break;
      case 'bottom':
        set({ bottomPanelHeight: Math.max(160, Math.min(600, size)) });
        break;
    }
  },

  toggleParticleSelection: (id) => {
    const next = new Set(get().selectedParticleIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set({ selectedParticleIds: next });
  },

  selectParticleRange: (ids) => {
    const next = new Set(get().selectedParticleIds);
    ids.forEach(id => next.add(id));
    set({ selectedParticleIds: next });
  },

  isParticleSelected: (id) => get().selectedParticleIds.has(id),

  clearSelection: () => set({ selectedParticleIds: new Set() }),

  setShowEnergyHeatmap: (v) => set({ showEnergyHeatmap: v }),
  setHeatmapOpacity: (v) => set({ heatmapOpacity: Math.max(0, Math.min(1, v)) }),
  setShowDetectorGeometry: (v) => set({ showDetectorGeometry: v }),
  setDetectorOpacity: (v) => set({ detectorOpacity: Math.max(0, Math.min(1, v)) }),
  setSyncViews: (v) => set({ syncViews: v }),
  setShowGrid: (v) => set({ showGrid: v }),
  setShowAxes: (v) => set({ showAxes: v }),
  setShowTrackPoints: (v) => set({ showTrackPoints: v }),
  setShowMissingET: (v) => set({ showMissingET: v }),
}));
