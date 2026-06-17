import { create } from 'zustand';
import type { PhysicsEvent, BranchMapping } from '@/types/physics';
import { generateMockEvents } from '@/services/mockData/eventGenerator';
import { loadRealEvents } from '@/services/io/fileParser';

interface EventState {
  events: PhysicsEvent[];
  currentEventIndex: number;
  loadedFormat: 'mock' | 'root' | 'hdf5' | null;
  loadedFileName: string | null;
  isRealData: boolean;
  candidateEventIds: Set<number>;
  isLoading: boolean;
  loadingProgress: number;
  error: string | null;
  get currentEvent(): PhysicsEvent | null;
  get totalEvents(): number;
  get isFirstEvent(): boolean;
  get isLastEvent(): boolean;
  get isCandidate(): boolean;
  get eventIdToIndexMap(): Map<number, number>;
  loadMockData: () => Promise<void>;
  loadFromROOT: (file: File) => Promise<void>;
  loadFromHDF5: (file: File) => Promise<void>;
  loadFromRealFile: (
    file: File,
    mappings: BranchMapping[],
    maxEvents?: number,
    progress?: (done: number, total: number) => void,
  ) => Promise<void>;
  setEvents: (events: PhysicsEvent[], format: 'mock' | 'root' | 'hdf5', fileName?: string) => void;
  gotoEvent: (indexOrEventId: number) => void;
  nextEvent: () => void;
  prevEvent: () => void;
  toggleCandidate: (eventId?: number) => void;
  clearData: () => void;
}

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  currentEventIndex: 0,
  loadedFormat: null,
  loadedFileName: null,
  isRealData: false,
  candidateEventIds: new Set<number>(),
  isLoading: false,
  loadingProgress: 0,
  error: null,

  get currentEvent() {
    const { events, currentEventIndex } = get();
    return events[currentEventIndex] ?? null;
  },

  get totalEvents() {
    return get().events.length;
  },

  get isFirstEvent() {
    return get().currentEventIndex === 0;
  },

  get isLastEvent() {
    const { currentEventIndex, events } = get();
    return currentEventIndex >= events.length - 1;
  },

  get isCandidate() {
    const { currentEvent, candidateEventIds } = get();
    return currentEvent ? candidateEventIds.has(currentEvent.eventId) : false;
  },

  get eventIdToIndexMap() {
    const m = new Map<number, number>();
    get().events.forEach((ev, idx) => m.set(ev.eventId, idx));
    return m;
  },

  loadMockData: async () => {
    set({ isLoading: true, error: null, loadingProgress: 0 });
    try {
      const events = await generateMockEvents(50);
      set({
        events,
        currentEventIndex: 0,
        loadedFormat: 'mock',
        loadedFileName: 'mock_events.root',
        isRealData: false,
        candidateEventIds: new Set<number>(),
        isLoading: false,
        loadingProgress: 100,
      });
      (window as any).__EVENT_STORE__ = get();
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  loadFromROOT: async (file: File) => {
    await get().loadFromRealFile(file, []);
  },

  loadFromHDF5: async (file: File) => {
    await get().loadFromRealFile(file, []);
  },

  loadFromRealFile: async (file, mappings, maxEvents = 200, progress) => {
    set({ isLoading: true, error: null, loadingProgress: 0 });
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const format: 'root' | 'hdf5' = ext === 'root' ? 'root' : 'hdf5';
      const events = await loadRealEvents(
        file,
        mappings.length > 0 ? mappings : [],
        maxEvents,
        (d, t) => {
          const p = Math.round(d * 100 / t);
          set({ loadingProgress: p });
          progress?.(d, t);
        },
      );
      if (!events || events.length === 0) {
        throw new Error('解析完成但未生成有效事件，请检查分支映射是否正确');
      }
      set({
        events,
        currentEventIndex: 0,
        loadedFormat: format,
        loadedFileName: file.name,
        isRealData: true,
        candidateEventIds: new Set<number>(),
        isLoading: false,
        loadingProgress: 100,
        error: null,
      });
      (window as any).__EVENT_STORE__ = get();
    } catch (e) {
      set({
        error: (e as Error).message || '导入失败',
        isLoading: false,
        loadingProgress: 0,
      });
      throw e;
    }
  },

  setEvents: (events, format, fileName) => {
    set({
      events,
      currentEventIndex: 0,
      loadedFormat: format,
      loadedFileName: fileName ?? null,
      isRealData: format !== 'mock',
      candidateEventIds: new Set<number>(),
    });
    (window as any).__EVENT_STORE__ = get();
  },

  gotoEvent: (indexOrEventId: number) => {
    const { events, eventIdToIndexMap } = get();
    let idx = indexOrEventId;
    if (idx >= events.length || !events[idx] || events[idx]?.eventId !== indexOrEventId) {
      const mapped = eventIdToIndexMap.get(indexOrEventId);
      if (mapped !== undefined) idx = mapped;
    }
    if (idx >= 0 && idx < events.length) {
      set({ currentEventIndex: idx });
    }
  },

  nextEvent: () => {
    const { currentEventIndex, events, gotoEvent } = get();
    gotoEvent(Math.min(currentEventIndex + 1, events.length - 1));
  },

  prevEvent: () => {
    const { currentEventIndex, gotoEvent } = get();
    gotoEvent(Math.max(currentEventIndex - 1, 0));
  },

  toggleCandidate: (eventId?: number) => {
    const { currentEvent, candidateEventIds } = get();
    const id = eventId ?? currentEvent?.eventId;
    if (id === undefined) return;
    const next = new Set(candidateEventIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    set({ candidateEventIds: next });
  },

  clearData: () => {
    set({
      events: [],
      currentEventIndex: 0,
      loadedFormat: null,
      loadedFileName: null,
      isRealData: false,
      candidateEventIds: new Set(),
      error: null,
      loadingProgress: 0,
    });
  },
}));
