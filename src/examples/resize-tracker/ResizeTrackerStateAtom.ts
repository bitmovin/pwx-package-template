import type { ContextWithState } from '../../../types/framework/ExecutionContext';

interface ResizeTrackerState {
  entries: ResizeObserverEntry[];
}

export type ResizeTrackerStateAtom = ReturnType<typeof createResizeTrackerStateAtom>;

export function createResizeTrackerStateAtom(context: ContextWithState) {
  const initialState: ResizeTrackerState = { entries: [] };

  return context.effects.state.create(initialState, {
    set: (state: ResizeTrackerState, entries: ResizeObserverEntry[]) => {
      if (state.entries == entries) {
        return false;
      }
      state.entries = entries;
      return true;
    },
  });
}
