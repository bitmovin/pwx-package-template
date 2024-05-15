import type { EmptyObject } from '@bitmovin/player-web-x/framework-types/BaseTypes';
import { createPackage, createTask, createTaskClosure } from '@bitmovin/player-web-x/playerx-framework-utils';
import type { BundleExportNames } from '@bitmovin/player-web-x/types/bundles/Types';
import type { StateAtom } from '@bitmovin/player-web-x/types/packages/core/state/Types';
import type { CoreEffects, CoreExportNames, CoreStateAtoms } from '@bitmovin/player-web-x/types/packages/core/Types';
import type { Logger } from '@bitmovin/player-web-x/types/packages/core/utils/Logger';
import type { VideoElementAtom } from '@bitmovin/player-web-x/types/packages/source/atoms/VideoElementAtom';
import type {
  SourceExportNames,
  SourceReference,
  SourceReferences,
} from '@bitmovin/player-web-x/types/packages/source/Types';
import type { SourceApiBase, SourcesApi } from '@bitmovin/player-web-x/types/packages/sources-api/Types';
import type { ContextWithState } from '@bitmovin/player-web-x/types/packages/Types';

export const PlaylistPackageThreadName = 'playlist-package-thread';

export type PlaylistPackageDependencies = {
  [BundleExportNames.Logger]: Logger;
  [CoreExportNames.CoreEffects]: CoreEffects;
  [CoreExportNames.CoreStateAtoms]: CoreStateAtoms;
  [SourceExportNames.SourceReferences]: SourceReferences;
};

type SourceChangeCallback = (data: { url: string; id: string; active: boolean }[]) => void;

export type PlaylistAPI = SourcesApi<SourceApiBase> & {
  playlist: {
    next: () => void;
    previous: () => void;
    onSourcesChange: (callback: SourceChangeCallback) => () => void;
    activate: (url: string) => void;
  };
};

const sourceVideoChange = (sourceReferences: SourceReferences) =>
  createTask('playlist-source-change-on-end', function (video: VideoElementAtom, ctx: ContextWithState) {
    const onEnded = () => {
      if (video.element) {
        if (video.element.currentTime > 0 && video.element.duration > 0) {
          selectSourceByIndex(ctx, 1, sourceReferences);
        }
      }
    };

    if (video.element) {
      ctx.effects.events.subscribe(ctx, video.element, 'ended', onEnded);
    }

    return ctx.effects.loop(ctx.abortSignal);
  });

const sourcesChangeTask = createTask(
  PlaylistPackageThreadName,
  function (sources: SourceReferences, ctx: ContextWithState) {
    sources.forEach(source => {
      ctx.effects.state.subscribe(ctx, source.state.video, sourceVideoChange(sources));
    });

    return ctx.effects.loop(ctx.abortSignal);
  },
);

export const PlaylistPackage = createPackage<PlaylistPackageDependencies, EmptyObject, PlaylistAPI>(
  'playlist-package',
  (apiManager, ctx) => {
    const logger = ctx.registry.get('logger');
    const sourceReferences = ctx.registry.get('source-references');
    const { StateEffectFactory, EventListenerEffectFactory } = ctx.registry.get('core-effects');
    const sourcesContext = ctx.using(StateEffectFactory).using(EventListenerEffectFactory);

    logger.log('Using Playlist package');

    apiManager.set('playlist', createPlaylistAPI(sourcesContext, sourceReferences, apiManager.api));

    sourcesContext.effects.state.subscribe(sourcesContext, sourceReferences, sourcesChangeTask);
  },
  ['logger', 'core-effects', 'core-state-atoms', 'source-references'],
);

function createPlaylistAPI(ctx: ContextWithState, sourceReferences: SourceReferences, api: PlaylistAPI) {
  return {
    next: () => selectSourceByIndex(ctx, 1, sourceReferences),
    previous: () => selectSourceByIndex(ctx, -1, sourceReferences),
    activate: (id: string) => {
      const nextSource = api.sources.list().find(source => source.id === id);

      if (nextSource) {
        api.sources.attachVideo(nextSource);
      }
    },
    onSourcesChange(callback: (sources: ReturnType<typeof mapSourcesForCallback>) => void) {
      return ctx.effects.state.subscribe(
        ctx,
        sourceReferences,
        onSourcesChangeTask(sourceReferences, () => {
          sourceReferences.forEach(ref =>
            ctx.effects.state.subscribe(ctx, ref.state.video, onSourcesChangeTask(sourceReferences, callback)),
          );
          callback(mapSourcesForCallback(sourceReferences));
        }),
      );
    },
  };
}

const onSourcesChangeTask = createTaskClosure(
  (sourceReferences: SourceReferences, callback: (sources: ReturnType<typeof mapSourcesForCallback>) => void) => [
    'on-sources-changed-subscriber',
    (_: StateAtom, __: ContextWithState) => {
      callback(mapSourcesForCallback(sourceReferences));
    },
  ],
);

function mapSourcesForCallback(references: SourceReferences) {
  return references.map(reference => {
    return {
      url: reference.state.url,
      id: reference.id,
      active: Boolean(reference.state.video.element),
    };
  });
}

function selectSourceByIndex(ctx: ContextWithState, index: number, sourceReferences: SourceReferences) {
  const currentSource = sourceReferences.find(source => source.state.video.element);
  if (!currentSource) {
    return;
  }
  const nextSourceIndex = sourceReferences.indexOf(currentSource) + index;
  const nextSource = sourceReferences[nextSourceIndex];

  if (nextSource) {
    activateSource(ctx, currentSource as SourceReference, nextSource as SourceReference);
  }
}

function activateSource(ctx: ContextWithState, currentSource: SourceReference, nextSource: SourceReference) {
  const videoElement = currentSource.state.video.element;
  if (!videoElement) {
    return;
  }

  ctx.effects.state.dispatch(currentSource.state.video.clear);
  ctx.effects.state.dispatch(nextSource.state.video.set, videoElement);
}

export default PlaylistPackage;
