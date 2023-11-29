import { createPackage, createTask } from '@bitmovin/player-web-x/playerx-framework-utils';
import type { EmptyObject } from '@bitmovin/player-web-x/types/BaseTypes';
import type { CoreEffects, CoreStateAtoms } from '@bitmovin/player-web-x/types/framework/core/core/Core.package';
import type { ArrayAtom } from '@bitmovin/player-web-x/types/framework/core/core/state/ArrayStateAtom';
import type { Logger } from '@bitmovin/player-web-x/types/framework/core/core/utils/Logger';
import type { SourceStateAtom } from '@bitmovin/player-web-x/types/framework/core/source/atoms/SourceStateAtom';
import type {
  PlayerAndSourcesApi,
  SourceApiExportNames,
} from '@bitmovin/player-web-x/types/framework/core/sources-api/Types';
import type { ContextWithState } from '@bitmovin/player-web-x/types/framework/core/Types';
import type { ComponentName } from '@bitmovin/player-web-x/types/framework/Types';

export const PlaylistPackageThreadName = 'playlist-package-thread';

export type PlaylistPackageDependencies = {
  [ComponentName.Logger]: Logger;
  [ComponentName.CoreEffects]: CoreEffects;
  [ComponentName.CoreStateAtoms]: CoreStateAtoms;
  [SourceApiExportNames.SourceList]: ArrayAtom<SourceStateAtom>;
};

const sourceVideoChange = (_: ArrayAtom<SourceStateAtom>, api: PlaylistAPI) =>
  createTask('playlist-source-change-on-end', function (data: SourceStateAtom, ctx: ContextWithState) {
    const onEnded = () => {
      if (data.video.element) {
        if (data.video.element.currentTime > 0 && data.video.element.duration > 0) {
          api.playlist.next();
        }
      }
    };

    if (data.video.element && data.isActive) {
      data.video.element.addEventListener('ended', onEnded);
    }

    const onAbort = () => {
      data.video.element?.removeEventListener('ended', onEnded);
      ctx.abortSignal.removeEventListener('abort', onAbort);
    };

    ctx.abortSignal.addEventListener('abort', onAbort);

    return ctx.effects.loop(ctx.abortSignal);
  });

const sourcesChangeTask = (api: PlaylistAPI) =>
  createTask(PlaylistPackageThreadName, function (sources: ArrayAtom<SourceStateAtom>, ctx: ContextWithState) {
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
    const logger = ctx.registry.get('logger');
    const sourcesState = ctx.registry.get('source-list');
    const { StateEffectFactory, EventListenerEffectFactory } = ctx.registry.get('core-effects');
    const sourcesContext = ctx.using(StateEffectFactory).using(EventListenerEffectFactory);

    logger.log('Using Playlist package');

    apiManager.set('playlist', createPlaylistAPI(sourcesContext, sourcesState, apiManager.api));

    sourcesContext.effects.state.subscribe(sourcesContext, sourcesState, sourcesChangeTask(apiManager.api), () => true);
  },
  ['logger', 'core-state-atoms', 'source-list', 'core-effects'],
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
        createTask('onSourcesChangeAPI', function (data: ArrayAtom<SourceStateAtom>, _: typeof ctx) {
          sources.forEach(source => {
            ctx.effects.state.subscribe(
              ctx,
              source,
              createTask('onSourceChangeAPI', function (_: SourceStateAtom, __: typeof ctx) {
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
