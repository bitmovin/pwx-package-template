import type { ContextWithState } from '@bitmovin/player-web-x/types/framework/core/Types';

import { VideoElementEventListeners } from './VideoElementEventListeners';

/**
 * Represents the playback state of a source
 */
export enum Playback {
  Suspended = 'suspended',
  Paused = 'paused',
  Playing = 'playing',
  Seeking = 'seeking',
  Stalled = 'stalled',
  Ended = 'ended',
}

interface BasePlaybackState {
  state: Playback;
}

interface SuspendedState extends BasePlaybackState {
  state: Playback.Suspended;
}

interface ActiveState extends BasePlaybackState {
  state: Exclude<Playback, Playback.Suspended>;
  playhead: number;
  duration: number;
  playbackRate: number;
}

export type PlaybackState = SuspendedState | ActiveState;

function createInitialPlaybackState(): PlaybackState {
  return { state: Playback.Suspended };
}

/**
 * Is dispatched whenever a source is being suspended,
 * e.g. due to a different source being activated
 */
function onSuspended(playbackState: PlaybackState) {
  if (playbackState.state === Playback.Suspended) {
    return false;
  }

  const partiallyActiveState = playbackState as Partial<ActiveState>;
  const suspendedState = playbackState as unknown as SuspendedState;

  delete partiallyActiveState.playhead;
  delete partiallyActiveState.duration;
  delete partiallyActiveState.playbackRate;

  suspendedState.state = Playback.Suspended;

  return true;
}

/**
 * Is dispatched when a source becomes active
 */
function onResume(playbackState: PlaybackState) {
  if (playbackState.state !== Playback.Suspended) {
    return false;
  }

  const activeState = playbackState as unknown as ActiveState;

  activeState.state = Playback.Paused;
  activeState.playhead = -1;
  activeState.duration = -1;
  activeState.playbackRate = -1;

  return true;
}

export type PlaybackStateAtom = ReturnType<typeof createPlaybackStateAtom>;

export function createPlaybackStateAtom(context: ContextWithState) {
  return context.effects.state.create(createInitialPlaybackState(), {
    onSuspended,
    onResume,
    ...VideoElementEventListeners,
  });
}
