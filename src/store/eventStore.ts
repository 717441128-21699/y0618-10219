import { create } from 'zustand';
import type { PhysicsEvent, ParticleType } from '@/types/physics';
import { generateMockEvents } from '@/services/mockData/eventGenerator';

interface EventState {
  events: PhysicsEvent[];
  currentEventIndex: number;
  loadedFormat: 'mock' | 'root' | 'hdf5' | null;
  candidateEventIds: Set<number>;
  isLoading: boolean;
  error: string | null;
  get currentEvent(): PhysicsEvent | null;
  get totalEvents(): number;
  get isFirstEvent(): boolean;
  get isLastEvent(): boolean;
  get isCandidate(): boolean;
  loadMockData: () => Promise<void>;
  loadFromROOT: (file: File) => Promise<void>;
  loadFromHDF5: (file: File) => Promise<void>;
  gotoEvent: (index: number) => void;
  nextEvent: () => void;
  prevEvent: () => void;
  toggleCandidate: (eventId?: number) => void;
  clearData: () => void;
}

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  currentEventIndex: 0,
  loadedFormat: null,
  candidateEventIds: new Set<number>(),
  isLoading: false,
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

  loadMockData: async () => {
    set({ isLoading: true, error: null });
    try {
      const events = await generateMockEvents(50);
      set({
        events,
        currentEventIndex: 0,
        loadedFormat: 'mock',
        isLoading: false,
      });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  loadFromROOT: async (_file: File) => {
    set({ isLoading: true, error: 'ROOT解析器开发中，将加载模拟数据' });
    await new Promise(r => setTimeout(r, 800));
    const events = await generateMockEvents(50);
    set({
      events,
      currentEventIndex: 0,
      loadedFormat: 'root',
      isLoading: false,
    });
  },

  loadFromHDF5: async (_file: File) => {
    set({ isLoading: true, error: 'HDF5解析器开发中，将加载模拟数据' });
    await new Promise(r => setTimeout(r, 800));
    const events = await generateMockEvents(50);
    set({
      events,
      currentEventIndex: 0,
      loadedFormat: 'hdf5',
      isLoading: false,
    });
  },

  gotoEvent: (index: number) => {
    const { events } = get();
    if (index >= 0 && index < events.length) {
      set({ currentEventIndex: index });
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
      candidateEventIds: new Set(),
      error: null,
    });
  },
}));
