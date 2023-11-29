import type { ContextHaving } from '@bitmovin/player-web-x/framework-types/execution-context/Types';
import { createPackage } from '@bitmovin/player-web-x/playerx-framework-utils';
import type { CoreEffects, CoreStateAtoms } from '@bitmovin/player-web-x/types/framework/core/core/Core.package';
import type { ContextWithState } from '@bitmovin/player-web-x/types/framework/core/Types';
import type { ComponentName } from '@bitmovin/player-web-x/types/framework/Types';

import { CustomComponentName } from './CustomComponents';
import type { DownloadInfoAtom } from './DownloadInfoAtom';
import { DownloadInfoSubscriber } from './DownloadInfoSubscriber';
import { createDownloadStatisticsApi } from './DownloadStatisticsApi';
import type { DownloadStatisticsAtom } from './DownloadStatisticsAtom';
import { createDownloadStatisticsAtom } from './DownloadStatisticsAtom';

type Dependencies = {
  [ComponentName.CoreEffects]: CoreEffects;
  [ComponentName.CoreStateAtoms]: CoreStateAtoms;
  [CustomComponentName.DownloadInfoAtom]: DownloadInfoAtom;
};

type Exports = {
  [CustomComponentName.DownloadStatisticsAtom]: DownloadStatisticsAtom;
};

export type DownloadStatisticsApi = {
  getAverageBytesPerSecond(): number;
  getAverageTimeToFirstByte(): number;
};

export type DownloadStatisticsContext = ContextHaving<Dependencies, Exports, ContextWithState>;

export const DownloadStatisticsPackage = createPackage<Dependencies, Exports, DownloadStatisticsApi>(
  'segment-download-statistics-package',
  (apiManager, baseContext) => {
    const { StateEffectFactory, EventListenerEffectFactory } = baseContext.registry.get('core-effects');
    const context = baseContext.using(StateEffectFactory).using(EventListenerEffectFactory);
    const downloadInfoAtom = context.registry.get(CustomComponentName.DownloadInfoAtom);
    const downloadStatisticsAtom = createDownloadStatisticsAtom(context, 25);
    const { state } = context.effects;

    createDownloadStatisticsApi(downloadStatisticsAtom, apiManager);
    context.registry.set(CustomComponentName.DownloadStatisticsAtom, downloadStatisticsAtom);
    state.subscribe(context, downloadInfoAtom, DownloadInfoSubscriber);
  },
  ['core-effects', CustomComponentName.DownloadInfoAtom, 'core-state-atoms'],
);

export default DownloadStatisticsPackage;
