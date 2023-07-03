import type { SourceStateAtom } from '../../../types/atoms/SourceStateAtom';
import type { MyApi } from '../../../types/bundles/Types';
import type { Logger } from '../../../types/components/Logger';
import type { StoreEffectFactory } from '../../../types/framework/Effects';
import type { ContextHaving, ContextUsing, ContextWithState } from '../../../types/framework/ExecutionContext';
import type { CoreEffects } from '../../../types/packages/Core.package';
import { ComponentName } from '../../framework-exports/Components';
import { createPackage } from '../../framework-exports/Package';
import { createPipeline } from '../../framework-exports/Pipeline';
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

export const ResizeTrackerPackage = createPackage<Dependencies, ResizeTrackerExports, MyApi>(
  'resize-tracker-package',
  (apiManager, baseContext) => {
    const { StateEffectFactory, StoreEffectFactory } = baseContext.registry.get(ComponentName.CoreEffects);

    const contextWithState = baseContext.using(StateEffectFactory);
    const videoElementState = createVideoElementStateAtom(contextWithState);
    const resizeTrackerState = createResizeTrackerStateAtom(contextWithState);

    const contextWithVideoState = contextWithState
      .using(StoreEffectFactory('videoElementState', videoElementState))
      .using(StoreEffectFactory('resizeTrackerState', resizeTrackerState))
      .using(ResizeObserverEffectFactory);

    baseContext.registry.set(ResizeTrackerExportNames.ResizeTrackerStateAtom, resizeTrackerState);

    const sourceState = baseContext.registry.get(ComponentName.SourceState);
    const { state } = contextWithVideoState.effects;

    state.subscribe(contextWithVideoState, videoElementState, VideoElementSubscriber);
    state.subscribe(contextWithVideoState, sourceState, SourceStateChangeSubscriber);
  },
  [ComponentName.CoreEffects, ComponentName.SourceState, ComponentName.Logger],
);

const VideoElementSubscriber = createPipeline(
  'video-element-subscriber',
  (videoElementState: VideoElementStateAtom, context: VideoStateContext) => {
    const video = videoElementState.element;

    if (video === undefined) {
      return;
    }

    const { state, store, resize } = context.effects;
    const { resizeTrackerState } = store;

    const logger = context.registry.get(ComponentName.Logger);

    resize.subscribe(video, entry => {
      logger.log('[RT]', entry);
      state.dispatch(resizeTrackerState.set, entry);
    });

    return context.effects.loop(context.abortSignal);
  },
);

const SourceStateChangeSubscriber = createPipeline(
  'source-state-change-subscriber',
  (source: SourceStateAtom, context: VideoStateContext) => {
    const { state, store } = context.effects;
    const { videoElementState } = store;

    state.dispatch(videoElementState.set, source.video);

    return context.effects.loop(context.abortSignal);
  },
);

export default ResizeTrackerPackage;
