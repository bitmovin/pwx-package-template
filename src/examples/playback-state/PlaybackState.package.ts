import type { SourceStateAtom } from '../../../types/atoms/SourceStateAtom';
import type { MyApi } from '../../../types/bundles/Types';
import type { Logger } from '../../../types/components/Logger';
import type { StoreEffectFactory } from '../../../types/framework/Effects';
import type { ContextHaving, ContextUsing, ContextWithState } from '../../../types/framework/ExecutionContext';
import type { CoreEffects } from '../../../types/packages/Core.package';
import { ComponentName } from '../../framework-exports/Components';
import { createPackage } from '../../framework-exports/Package';
import { createPipeline } from '../../framework-exports/Pipeline';
import type { EventListenerEffect } from './EventListenerEffectFactory';
import { EventListenerEffectFactory } from './EventListenerEffectFactory';
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
      EventListenerEffect,
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
export const PlaybackStatePackage = createPackage<Dependencies, PlaybackStatePackageExports, MyApi>(
  'playback-state-package',
  (apiManager, baseContext) => {
    const { StateEffectFactory, StoreEffectFactory } = baseContext.registry.get(ComponentName.CoreEffects);
    const contextWithState = baseContext.using(StateEffectFactory);
    const playbackStateAtom = createPlaybackStateAtom(contextWithState);
    // Create videoElementStateAtom to be able to subscribe on videoElement being set or unset
    const videoElementState = createVideoElementStateAtom(contextWithState);

    // Create new context to store playbackState and videoElementState to make it available to children
    // Use EventListenerEffectFactory in the context
    const contextWithPlaybackState = contextWithState
      .using(StoreEffectFactory('playbackState', playbackStateAtom))
      .using(StoreEffectFactory('videoElementState', videoElementState))
      .using(EventListenerEffectFactory);

    const sourceState = baseContext.registry.get(ComponentName.SourceState);
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
      createPipeline('playback-state-subscriber', (playbackState: PlaybackStateAtom, context: PlaybackStateContext) => {
        const logger = context.registry.get(ComponentName.Logger);

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
  [ComponentName.CoreEffects, ComponentName.SourceState, ComponentName.Logger],

  // Package is considered a `Pipeline`, but we do not need to return loop in it, as it will by default it will add
  // one more step that returns loop
);

const VideoElementSubscriber = createPipeline(
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
    events.subscribe(video, 'timeupdate', () => state.dispatch(playbackState.onTimeupdate, video.currentTime));
    events.subscribe(video, 'durationchange', () => state.dispatch(playbackState.onDurationChange, video.duration));
    events.subscribe(video, 'ratechange', () => state.dispatch(playbackState.onPlaybackRateChange, video.playbackRate));
    events.subscribe(video, 'seeking', () => state.dispatch(playbackState.onSeek));
    events.subscribe(video, 'seeked', () => state.dispatch(playbackState.onSeeked, isPlaying()));
    events.subscribe(video, 'stalled', () => state.dispatch(playbackState.onStalled));
    events.subscribe(video, 'waiting', () => state.dispatch(playbackState.onWaiting));
    events.subscribe(video, 'playing', () => state.dispatch(playbackState.onPlaying));
    events.subscribe(video, 'pause', () => state.dispatch(playbackState.onPaused));
    events.subscribe(video, 'ended', () => state.dispatch(playbackState.onEnded));

    // Returning loop ensures this pipeline never finishes running until it is terminated by the parent.
    // If it had finished running, it would have removed subscribers above, as they are children of this thread
    // which was started with this pipeline.
    return context.effects.loop(context.abortSignal);
  },
);

const SourceStateChangeSubscriber = createPipeline(
  'source-state-change-subscriber',
  (source: SourceStateAtom, context: PlaybackStateContext) => {
    const { state, store } = context.effects;
    const { videoElementState, playbackState } = store;

    state.dispatch(videoElementState.set, source.video);

    if (source.video !== undefined) {
      state.dispatch(playbackState.onResume);
      state.dispatch(playbackState.onPlaybackRateChange, source.video.playbackRate);
    } else {
      state.dispatch(playbackState.onSuspended);
    }

    return context.effects.loop(context.abortSignal);
  },
);

export default PlaybackStatePackage;
