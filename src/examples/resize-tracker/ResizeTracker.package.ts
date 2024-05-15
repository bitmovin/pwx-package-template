import type { Abortable } from '@bitmovin/player-web-x/framework-types/abortable/Abortable';
import type { EmptyObject } from '@bitmovin/player-web-x/framework-types/BaseTypes';
import type { ContextHaving, ContextUsing } from '@bitmovin/player-web-x/framework-types/execution-context/Types';
import { createPackage, createTask } from '@bitmovin/player-web-x/playerx-framework-utils';
import type { BundleExportNames } from '@bitmovin/player-web-x/types/bundles/Types';
import type { StoreEffectFactory } from '@bitmovin/player-web-x/types/packages/core/state/StoreEffectFactory';
import type { CoreEffects, CoreExportNames } from '@bitmovin/player-web-x/types/packages/core/Types';
import type { Logger } from '@bitmovin/player-web-x/types/packages/core/utils/Logger';
import type { SourceStateAtom } from '@bitmovin/player-web-x/types/packages/source/atoms/SourceStateAtom';
import type { VideoElementAtom } from '@bitmovin/player-web-x/types/packages/source/atoms/VideoElementAtom';
import type { SourceExportNames } from '@bitmovin/player-web-x/types/packages/source/Types';
import type { ContextWithState } from '@bitmovin/player-web-x/types/packages/Types';

import type { ResizeObserverEffect } from './ResizeObserverEffectFactory';
import { ResizeObserverEffectFactory } from './ResizeObserverEffectFactory';
import type { ResizeTrackerStateAtom } from './ResizeTrackerStateAtom';
import { createResizeTrackerStateAtom } from './ResizeTrackerStateAtom';

type Dependencies = {
  [CoreExportNames.CoreEffects]: CoreEffects;
  [SourceExportNames.SourceState]: SourceStateAtom;
  [BundleExportNames.Logger]: Logger;
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
    [StoreEffectFactory<'resizeTrackerState', ResizeTrackerStateAtom>, ResizeObserverEffect],
    ContextWithState
  >
>;

export const ResizeTrackerPackage = createPackage<Dependencies, ResizeTrackerExports, EmptyObject>(
  'resize-tracker-package',
  (apiManager, baseContext) => {
    const { StateEffectFactory, StoreEffectFactory, EventListenerEffectFactory } =
      baseContext.registry.get('core-effects');

    const contextWithState = baseContext.using(StateEffectFactory).using(EventListenerEffectFactory);
    const resizeTrackerState = createResizeTrackerStateAtom(contextWithState);

    const contextWithVideoState = contextWithState
      .using(StoreEffectFactory('resizeTrackerState', resizeTrackerState))
      .using(ResizeObserverEffectFactory);

    baseContext.registry.set('resize-tracker-state-atom', resizeTrackerState);

    const sourceState = baseContext.registry.get('source-state-atom');
    const { state } = contextWithVideoState.effects;

    const initial = contextWithVideoState.fork(VideoElementSubscriber(), sourceState.video, () => true);
    initial.catch(() => {
      /* */
    });
    state.subscribe(contextWithVideoState, sourceState.video, VideoElementSubscriber(initial));
  },
  ['core-effects', 'source-state-atom', 'logger'],
);

const VideoElementSubscriber = (initialAbortable?: Abortable) =>
  createTask('video-element-subscriber', (videoElementState: VideoElementAtom, context: VideoStateContext) => {
    if (initialAbortable) {
      initialAbortable.abort(new Error('Aborted due to subscriber triggering'));
    }
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
  });

export default ResizeTrackerPackage;
