import { EmptyObject } from '@bitmovin/player-web-x/framework-types/BaseTypes';
import type { ContextHaving, ContextUsing } from '@bitmovin/player-web-x/framework-types/execution-context/Types';
import { createPackage, createTask } from '@bitmovin/player-web-x/playerx-framework-utils';
import type { CoreEffects } from '@bitmovin/player-web-x/types/framework/core/core/Core.package';
import type { StoreEffectFactory } from '@bitmovin/player-web-x/types/framework/core/core/state/StoreEffectFactory';
import type { Logger } from '@bitmovin/player-web-x/types/framework/core/core/utils/Logger';
import type { SourceStateAtom } from '@bitmovin/player-web-x/types/framework/core/source/atoms/SourceStateAtom';
import type { ContextWithState } from '@bitmovin/player-web-x/types/framework/core/Types';
import type { ComponentName } from '@bitmovin/player-web-x/types/framework/Types';

import type { ResizeObserverEffect } from './ResizeObserverEffectFactory';
import { ResizeObserverEffectFactory } from './ResizeObserverEffectFactory';
import type { ResizeTrackerStateAtom } from './ResizeTrackerStateAtom';
import { createResizeTrackerStateAtom } from './ResizeTrackerStateAtom';
import type { VideoElementStateAtom } from './VideoElementStateAtom';
import { createVideoElementStateAtom } from './VideoElementStateAtom';

type Dependencies = {
  [ComponentName.CoreEffects]: CoreEffects;
  [ComponentName.SourceState]: SourceStateAtom;
  [ComponentName.Logger]: Logger;
};

export enum ResizeTrackerExportNames {
  ResizeTrackerStateAtom = 'resize-tracker-state-atom',
}

export type ResizeTrackerExports = {
  [ResizeTrackerExportNames.ResizeTrackerStateAtom]: ResizeTrackerStateAtom;
};

export type VideoStateContext = ContextHaving<
  Dependencies,
  ResizeTrackerExports,
  ContextUsing<
    [
      StoreEffectFactory<'videoElementState', VideoElementStateAtom>,
      StoreEffectFactory<'resizeTrackerState', ResizeTrackerStateAtom>,
      ResizeObserverEffect,
    ],
    ContextWithState
  >
>;

export const ResizeTrackerPackage = createPackage<Dependencies, ResizeTrackerExports, EmptyObject>(
  'resize-tracker-package',
  (apiManager, baseContext) => {
    const { StateEffectFactory, StoreEffectFactory, EventListenerEffectFactory } =
      baseContext.registry.get('core-effects');

    const contextWithState = baseContext.using(StateEffectFactory).using(EventListenerEffectFactory);
    const videoElementState = createVideoElementStateAtom(contextWithState);
    const resizeTrackerState = createResizeTrackerStateAtom(contextWithState);

    const contextWithVideoState = contextWithState
      .using(StoreEffectFactory('videoElementState', videoElementState))
      .using(StoreEffectFactory('resizeTrackerState', resizeTrackerState))
      .using(ResizeObserverEffectFactory);

    baseContext.registry.set('resize-tracker-state-atom', resizeTrackerState);

    const sourceState = baseContext.registry.get('source-state');
    const { state } = contextWithVideoState.effects;

    state.subscribe(contextWithVideoState, videoElementState, VideoElementSubscriber);
    state.subscribe(contextWithVideoState, sourceState, SourceStateChangeSubscriber);
  },
  ['core-effects', 'source-state', 'logger'],
);

const VideoElementSubscriber = createTask(
  'video-element-subscriber',
  (videoElementState: VideoElementStateAtom, context: VideoStateContext) => {
    const video = videoElementState.element;

    if (video === undefined) {
      return;
    }

    const { state, store, resize } = context.effects;
    const { resizeTrackerState } = store;

    const logger = context.registry.get('logger');

    resize.subscribe(video, entry => {
      logger.log('[RT]', entry);
      state.dispatch(resizeTrackerState.set, entry);
    });

    return context.effects.loop(context.abortSignal);
  },
);

const SourceStateChangeSubscriber = createTask(
  'source-state-change-subscriber',
  (source: SourceStateAtom, context: VideoStateContext) => {
    const { state, store } = context.effects;
    const { videoElementState } = store;

    state.dispatch(videoElementState.set, source.video.element);

    return context.effects.loop(context.abortSignal);
  },
);

export default ResizeTrackerPackage;
