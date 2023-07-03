import type { EmptyObject } from '../../../types';
import type { ArrayAtom } from '../../../types/atoms/ArrayStateAtom';
import type { SourceStateAtom } from '../../../types/atoms/SourceStateAtom';
import type { Logger } from '../../../types/components/Logger';
import type { ContextWithState } from '../../../types/framework/ExecutionContext';
import type { CoreEffects, CoreStateAtoms } from '../../../types/packages/Core.package';
import type { PlayerAndSourcesApi } from '../../../types/packages/SourcesApi.package';
import { ComponentName } from '../../framework-exports/Components';
import { createPackage } from '../../framework-exports/Package';
import { createPipeline } from '../../framework-exports/Pipeline';
import { SourcesApiExportNames } from '../../framework-exports/SourcesApi';

export const PlaylistPackageThreadName = 'playlist-package-thread';

export type PlaylistPackageDependencies = {
  [ComponentName.Logger]: Logger;
  [ComponentName.CoreEffects]: CoreEffects;
  [ComponentName.CoreStateAtoms]: CoreStateAtoms;
  [SourcesApiExportNames.SourceList]: ArrayAtom<SourceStateAtom>;
};

const sourceVideoChange = (_: ArrayAtom<SourceStateAtom>, api: PlaylistAPI) =>
  createPipeline('playlist-source-change-on-end', function (data: SourceStateAtom, ctx: ContextWithState) {
    const onEnded = () => {
      if (data.video) {
        if (data.video.currentTime > 0 && data.video.duration > 0) {
          api.playlist.next();
        }
      }
    };

    if (data.video && data.isActive) {
      data.video.addEventListener('ended', onEnded);
    }

    const onAbort = () => {
      data.video?.removeEventListener('ended', onEnded);
      ctx.abortSignal.removeEventListener('abort', onAbort);
    };

    ctx.abortSignal.addEventListener('abort', onAbort);

    return ctx.effects.loop(ctx.abortSignal);
  });

const sourcesChangePipeline = (api: PlaylistAPI) =>
  createPipeline(PlaylistPackageThreadName, function (sources: ArrayAtom<SourceStateAtom>, ctx: ContextWithState) {
    sources.forEach(source => {
      ctx.effects.state.subscribe(ctx, source, sourceVideoChange(sources, api), () => true);
    });

    return ctx.effects.loop(ctx.abortSignal);
  });

type PlaylistAPI = PlayerAndSourcesApi & {
  playlist: {
    next: () => void;
    previous: () => void;
    onSourcesChange: (callback: (data: ArrayAtom<SourceStateAtom>) => void) => () => void;
    activate: (url: string) => void;
  };
};

export const PlaylistPackage = createPackage<PlaylistPackageDependencies, EmptyObject, PlaylistAPI>(
  'playlist-package',
  (apiManager, ctx) => {
    const logger = ctx.registry.get(ComponentName.Logger);
    const sourcesState = ctx.registry.get(SourcesApiExportNames.SourceList);
    const { StateEffectFactory } = ctx.registry.get(ComponentName.CoreEffects);
    const sourcesContext = ctx.using(StateEffectFactory);

    logger.log('Using Playlist package');

    apiManager.set('playlist', createPlaylistAPI(sourcesContext, sourcesState, apiManager.api));

    sourcesContext.effects.state.subscribe(
      sourcesContext,
      sourcesState,
      sourcesChangePipeline(apiManager.api),
      () => true,
    );
  },
  [ComponentName.Logger, ComponentName.CoreStateAtoms, SourcesApiExportNames.SourceList, ComponentName.CoreEffects],
);

function createPlaylistAPI(ctx: ContextWithState, sources: ArrayAtom<SourceStateAtom>, api: PlaylistAPI) {
  return {
    next: () => selectSourceByIndex(1, sources, api),
    previous: () => selectSourceByIndex(-1, sources, api),
    activate: (url: string) => {
      const source = sources.find(v => v.url === url);
      if (source) {
        api.sources.setActive(source);
      }
    },
    onSourcesChange(callback: (sources: ArrayAtom<SourceStateAtom>) => void) {
      return ctx.effects.state.subscribe(
        ctx,
        sources,
        createPipeline('onSourcesChangeAPI', function (data: ArrayAtom<SourceStateAtom>, _: typeof ctx) {
          sources.forEach(source => {
            ctx.effects.state.subscribe(
              ctx,
              source,
              createPipeline('onSourceChangeAPI', function (_: SourceStateAtom, __: typeof ctx) {
                callback(sources);
              }),
            );
          });
          callback(data);
        }),
      );
    },
  };
}

function selectSourceByIndex(index: number, sources: ArrayAtom<SourceStateAtom>, api: PlaylistAPI) {
  const currentSource = sources.find(source => source.isActive);
  if (!currentSource) {
    return;
  }
  const nextSourceIndex = sources.indexOf(currentSource) + index;
  const nextSource = sources[nextSourceIndex];

  if (nextSource) {
    api.sources.setActive(nextSource);
  }
}

export default PlaylistPackage;
