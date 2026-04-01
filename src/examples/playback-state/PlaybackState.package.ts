import type { Abortable } from '@bitmovin/player-web-x/framework-types/abortable/Abortable';
import type { EmptyObject } from '@bitmovin/player-web-x/framework-types/BaseTypes';
import type { ContextHaving, ContextUsing } from '@bitmovin/player-web-x/framework-types/execution-context/Types';
import { createPackage, createTask } from '@bitmovin/player-web-x/playerx-framework-utils';
import type { StoreEffectFactory } from '@bitmovin/player-web-x/types/packages/core/state/StoreEffectFactory';
import type { CoreEffects, CoreExportNames } from '@bitmovin/player-web-x/types/packages/core/Types';
import type { SourceStateAtom } from '@bitmovin/player-web-x/types/packages/source/atoms/SourceStateAtom';
import type { VideoElementAtom } from '@bitmovin/player-web-x/types/packages/source/atoms/VideoElementAtom';
import type { SourceExportNames } from '@bitmovin/player-web-x/types/packages/source/Types';
import type { ContextWithState } from '@bitmovin/player-web-x/types/packages/Types';

import type { PlaybackStateAtom } from './PlaybackStateAtom';
import { createPlaybackStateAtom, Playback } from './PlaybackStateAtom';
import type { PlaybackStatePackageExports } from './Types';
import { PlaybackStateExportNames } from './Types';

type Dependencies = {
  [CoreExportNames.CoreEffects]: CoreEffects;
  [SourceExportNames.SourceState]: SourceStateAtom;
};

/**
 * Top level `ExecutionContext` type that includes stored values (PlaybackStateAtom and VideoElementStateAtom)
 * and EventListenerEffect
 **/
export type PlaybackStateContext = ContextHaving<
  Dependencies,
  PlaybackStatePackageExports,
  ContextUsing<[StoreEffectFactory<'playbackState', PlaybackStateAtom>], ContextWithState>
>;

/**
 * PlaybackStatePackage
 *
 * Exports `PlaybackStateAtom` which is updated inside the package to the correct state based on VideoElement events.
 * Will get executed when [source-state, core-effects] are available
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

    const sourceState = baseContext.registry.get('source-state-atom');
    const { state } = contextWithPlaybackState.effects;

    const initialVideoElementSubscriberFork = contextWithPlaybackState.fork(
      VideoElementSubscriber(),
      sourceState.video,
      () => true,
    );
    initialVideoElementSubscriberFork.catch(() => {
      /* */
    });
    // Subscribe to video element being set or unset, and trigger `VideoElementSubscriber`
    state.subscribe(
      contextWithPlaybackState,
      sourceState.video,
      VideoElementSubscriber(initialVideoElementSubscriberFork),
    );

    // Export `PlaybackStateAtom` from the package
    contextWithPlaybackState.registry.set(PlaybackStateExportNames.PlaybackStateAtom, playbackStateAtom);

    // Sample that shows how to track `PlaybackState` changes
    state.subscribe(
      contextWithPlaybackState,
      playbackStateAtom,
      createTask('playback-state-subscriber', (playbackState: PlaybackStateAtom, context: PlaybackStateContext) => {
        const logger = context.effects.logger;
        const sourceUrl = sourceState.sourceConfig.resources[0]?.url ?? 'unknown';

        if (playbackState.state === Playback.Suspended) {
          logger.log(`[Playback suspended]: ${sourceUrl}`);
        } else {
          const { playhead, duration, playbackRate, state } = playbackState;
          logger.log(`[PlaybackState changed]: ${sourceUrl}`, {
            state,
            playhead,
            duration,
            playbackRate,
          });
        }
      }),
    );
  },
  ['core-effects', 'source-state-atom'],
);

const VideoElementSubscriber = (initialAbortable?: Abortable) =>
  createTask('video-element-subscriber', (videoElementState: VideoElementAtom, context: PlaybackStateContext) => {
    if (initialAbortable) {
      initialAbortable.abort(new Error('Aborted'));
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
    events.subscribe(context, video, 'timeupdate', () => state.dispatch(playbackState.onTimeupdate, video.currentTime));
    events.subscribe(context, video, 'durationchange', () =>
      state.dispatch(playbackState.onDurationChange, video.duration),
    );
    events.subscribe(context, video, 'ratechange', () =>
      state.dispatch(playbackState.onPlaybackRateChange, video.playbackRate),
    );
    events.subscribe(context, video, 'seeking', () => state.dispatch(playbackState.onSeek));
    events.subscribe(context, video, 'seeked', () => state.dispatch(playbackState.onSeeked, isPlaying()));
    events.subscribe(context, video, 'stalled', () => state.dispatch(playbackState.onStalled));
    events.subscribe(context, video, 'waiting', () => state.dispatch(playbackState.onWaiting));
    events.subscribe(context, video, 'playing', () => state.dispatch(playbackState.onPlaying));
    events.subscribe(context, video, 'pause', () => state.dispatch(playbackState.onPaused));
    events.subscribe(context, video, 'ended', () => state.dispatch(playbackState.onEnded));

    return context.effects.loop(context.abortSignal);
  });

export default PlaybackStatePackage;
