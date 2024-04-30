import { EmptyObject } from '@bitmovin/player-web-x/framework-types/BaseTypes';
import type { ContextHaving, ContextUsing } from '@bitmovin/player-web-x/framework-types/execution-context/Types';
import { createPackage, createTask } from '@bitmovin/player-web-x/playerx-framework-utils';
import type { CoreEffects } from '@bitmovin/player-web-x/types/framework/core/core/Core.package';
import type { StoreEffectFactory } from '@bitmovin/player-web-x/types/framework/core/core/state/StoreEffectFactory';
import type { Logger } from '@bitmovin/player-web-x/types/framework/core/core/utils/Logger';
import type { SourceStateAtom } from '@bitmovin/player-web-x/types/framework/core/source/atoms/SourceStateAtom';
import type { ContextWithState } from '@bitmovin/player-web-x/types/framework/core/Types';
import type { ComponentName } from '@bitmovin/player-web-x/types/framework/Types';

import type { PlaybackStateAtom } from './PlaybackStateAtom';
import { createPlaybackStateAtom, Playback } from './PlaybackStateAtom';
import type { PlaybackStatePackageExports } from './Types';
import { PlaybackStateExportNames } from './Types';
import type { VideoElementStateAtom } from './VideoElementStateAtom';
import { createVideoElementStateAtom } from './VideoElementStateAtom';

type Dependencies = {
  [ComponentName.Logger]: Logger;
  [ComponentName.CoreEffects]: CoreEffects;
  [ComponentName.SourceState]: SourceStateAtom;
};

/**
 * Top level `ExecutionContext` type that includes stored values (PlaybackStateAtom and VideoElementStateAtom)
 * and EventListenerEffect
 **/
export type PlaybackStateContext = ContextHaving<
  Dependencies,
  PlaybackStatePackageExports,
  ContextUsing<
    [
      StoreEffectFactory<'playbackState', PlaybackStateAtom>,
      StoreEffectFactory<'videoElementState', VideoElementStateAtom>,
    ],
    ContextWithState
  >
>;

/**
 * PlaybackStatePackage
 *
 * Exports `PlaybackStateAtom` which is updated inside the package to the correct state based on VideoElement events.
 * Will get executed when [source-state, core-effects, logger] are available
 */
export const PlaybackStatePackage = createPackage<Dependencies, PlaybackStatePackageExports, EmptyObject>(
  'playback-state-package',
  (apiManager, baseContext) => {
    const { StateEffectFactory, StoreEffectFactory, EventListenerEffectFactory } =
      baseContext.registry.get('core-effects');
    const contextWithState = baseContext.using(StateEffectFactory).using(EventListenerEffectFactory);
    const playbackStateAtom = createPlaybackStateAtom(contextWithState);
    // Create videoElementStateAtom to be able to subscribe on videoElement being set or unset
    const videoElementState = createVideoElementStateAtom(contextWithState);

    // Create new context to store playbackState and videoElementState to make it available to children
    // Use EventListenerEffectFactory in the context
    const contextWithPlaybackState = contextWithState
      .using(StoreEffectFactory('playbackState', playbackStateAtom))
      .using(StoreEffectFactory('videoElementState', videoElementState))
      .using(EventListenerEffectFactory);

    const sourceState = baseContext.registry.get('source-state');
    const { state } = contextWithPlaybackState.effects;

    // Subscribe to video element being set or unset, and trigger `VideoElementSubscriber`
    state.subscribe(contextWithPlaybackState, videoElementState, VideoElementSubscriber);
    // Subscribe to `SourceState` changes, which will update `VideoElementStateAtom` to the correct state
    state.subscribe(contextWithPlaybackState, sourceState, SourceStateChangeSubscriber);

    // Execute `SourceStateChangeSubscriber` right away so that the `PlaybackStateAtom` is properly initialized
    contextWithPlaybackState.fork(SourceStateChangeSubscriber, sourceState);

    // Export `PlaybackStateAtom` from the package
    contextWithPlaybackState.registry.set(PlaybackStateExportNames.PlaybackStateAtom, playbackStateAtom);

    // Sample that shows how to track `PlaybackState` changes
    state.subscribe(
      contextWithPlaybackState,
      playbackStateAtom,
      createTask('playback-state-subscriber', (playbackState: PlaybackStateAtom, context: PlaybackStateContext) => {
        const logger = context.registry.get('logger');

        if (playbackState.state === Playback.Suspended) {
          logger.log(`[Playback suspended]: ${sourceState.url}`);
        } else {
          const { playhead, duration, playbackRate, state } = playbackState;
          logger.log(`[PlaybackState changed]: ${sourceState.url}`, {
            state,
            playhead,
            duration,
            playbackRate,
          });
        }
      }),
    );
  },
  ['core-effects', 'source-state', 'logger'],

  // Package is considered a `Task`, but we do not need to return loop in it, as it will by default it will add
  // one more step that returns loop
);

const VideoElementSubscriber = createTask(
  'video-element-subscriber',
  (videoElementState: VideoElementStateAtom, context: PlaybackStateContext) => {
    const video = videoElementState.element;

    if (video === undefined) {
      return;
    }

    const { events, state, store } = context.effects;
    const { playbackState } = store;
    const isPlaying = () => !video.paused && !video.ended;

    state.dispatch(playbackState.onPlaybackRateChange, video.playbackRate);
    // Using EventListenerEffect, subscribe and dispatch correct state changes.
    // This ensures structured concurrency is honored, as the listeners will be automatically removed once the thread
    // has finished running.
    events.subscribe(context, video, 'timeupdate', () => state.dispatch(playbackState.onTimeupdate, video.currentTime));
    events.subscribe(context, video, 'durationchange', () => state.dispatch(playbackState.onDurationChange, video.duration));
    events.subscribe(context, video, 'ratechange', () => state.dispatch(playbackState.onPlaybackRateChange, video.playbackRate));
    events.subscribe(context, video, 'seeking', () => state.dispatch(playbackState.onSeek));
    events.subscribe(context, video, 'seeked', () => state.dispatch(playbackState.onSeeked, isPlaying()));
    events.subscribe(context, video, 'stalled', () => state.dispatch(playbackState.onStalled));
    events.subscribe(context, video, 'waiting', () => state.dispatch(playbackState.onWaiting));
    events.subscribe(context, video, 'playing', () => state.dispatch(playbackState.onPlaying));
    events.subscribe(context, video, 'pause', () => state.dispatch(playbackState.onPaused));
    events.subscribe(context, video, 'ended', () => state.dispatch(playbackState.onEnded));

    // Returning loop ensures this task never finishes running until it is terminated by the parent.
    // If it had finished running, it would have removed subscribers above, as they are children of this thread
    // which was started with this task.
    return context.effects.loop(context.abortSignal);
  },
);

const SourceStateChangeSubscriber = createTask(
  'source-state-change-subscriber',
  (source: SourceStateAtom, context: PlaybackStateContext) => {
    const { state, store } = context.effects;
    const { videoElementState, playbackState } = store;
    const video = source.video.element;

    state.dispatch(videoElementState.set, video);

    if (video !== undefined) {
      state.dispatch(playbackState.onResume);
      state.dispatch(playbackState.onPlaybackRateChange, video.playbackRate);
    } else {
      state.dispatch(playbackState.onSuspended);
    }

    return context.effects.loop(context.abortSignal);
  },
);

export default PlaybackStatePackage;
