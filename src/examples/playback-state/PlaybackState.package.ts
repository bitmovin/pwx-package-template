import { Abortable } from '@bitmovin/player-web-x/framework-types/abortable/Abortable';
import { EmptyObject } from '@bitmovin/player-web-x/framework-types/BaseTypes';
import type { ContextHaving, ContextUsing } from '@bitmovin/player-web-x/framework-types/execution-context/Types';
import { createPackage, createTask } from '@bitmovin/player-web-x/playerx-framework-utils';
import type { CoreEffects } from '@bitmovin/player-web-x/types/framework/core/core/Core.package';
import type { StoreEffectFactory } from '@bitmovin/player-web-x/types/framework/core/core/state/StoreEffectFactory';
import type { StateAtom } from '@bitmovin/player-web-x/types/framework/core/core/state/Types';
import type { Logger } from '@bitmovin/player-web-x/types/framework/core/core/utils/Logger';
import type { SourceStateAtom } from '@bitmovin/player-web-x/types/framework/core/source/atoms/SourceStateAtom';
import { VideoElementAtom } from '@bitmovin/player-web-x/types/framework/core/source/atoms/VideoElementAtom';
import type { ContextWithState } from '@bitmovin/player-web-x/types/framework/core/Types';
import type { ComponentName } from '@bitmovin/player-web-x/types/framework/Types';

import type { PlaybackStateAtom } from './PlaybackStateAtom';
import { createPlaybackStateAtom, Playback } from './PlaybackStateAtom';
import type { PlaybackStatePackageExports } from './Types';
import { PlaybackStateExportNames } from './Types';

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
  (_apiManager, baseContext) => {
    const { StateEffectFactory, StoreEffectFactory, EventListenerEffectFactory } =
      baseContext.registry.get('core-effects');
    const contextWithState = baseContext.using(StateEffectFactory).using(EventListenerEffectFactory);
    const playbackStateAtom = createPlaybackStateAtom(contextWithState);

    // Create new context to store playbackState and videoElementState to make it available to children
    // Use EventListenerEffectFactory in the context
    const contextWithPlaybackState = contextWithState
      .using(StoreEffectFactory('playbackState', playbackStateAtom))
      .using(EventListenerEffectFactory);

    const sourceState = baseContext.registry.get('source-state');
    const { state } = contextWithPlaybackState.effects;

    const initialVideoElementSubscriberFork = contextWithPlaybackState.fork(VideoElementSubscriber(), sourceState.video, () => true);
    initialVideoElementSubscriberFork.catch(() => {/* */})
    // Subscribe to video element being set or unset, and trigger `VideoElementSubscriber`
    state.subscribe(contextWithPlaybackState, sourceState.video, VideoElementSubscriber(initialVideoElementSubscriberFork));

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

const VideoElementSubscriber = (initialAbortable?: Abortable) => createTask(
  'video-element-subscriber',
  (videoElementState: VideoElementAtom, context: PlaybackStateContext) => {
    if (initialAbortable) {
      initialAbortable.abort(new Error('Aborted'))
    }
    const { events, state, store } = context.effects;
    const { playbackState } = store;
    const video = videoElementState.element;

    if (video !== undefined) {
      state.dispatch(playbackState.onResume);
      state.dispatch(playbackState.onPlaybackRateChange, video.playbackRate);
    } else {
      state.dispatch(playbackState.onSuspended);
      return;
    }

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


export default PlaybackStatePackage;
