import type { ContextWithState } from '../../../types/framework/ExecutionContext';

/**
 * A helper state atom that allows us to directly subscribe to the video element
 * of a given `SourceStateAtom`. The `StateEffect` only allows to subscribe to
 * `StateAtom`s and not individual fields of `StateAtom`s (unless those fields are
 * themselves `StateAtom`s).
 */

interface VideoElementState {
  element: HTMLVideoElement | undefined;
}

export type VideoElementStateAtom = ReturnType<typeof createVideoElementStateAtom>;

export const createVideoElementStateAtom = (context: ContextWithState) => {
  const initialState: VideoElementState = { element: undefined };

  return context.effects.state.create(initialState, {
    set(state: VideoElementState, element: HTMLVideoElement | undefined) {
      if (state.element === element) {
        return false;
      }

      state.element = element;

      return true;
    },
  });
};
