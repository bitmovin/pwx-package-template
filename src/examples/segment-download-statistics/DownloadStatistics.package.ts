import type { ContextHaving, ContextWithState } from '../../../types/framework/ExecutionContext';
import type { CoreEffects, CoreStateAtoms } from '../../../types/packages/Core.package';
import { ComponentName } from '../../framework-exports/Components';
import { createPackage } from '../../framework-exports/Package';
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
    const { StateEffectFactory } = baseContext.registry.get(ComponentName.CoreEffects);
    const context = baseContext.using(StateEffectFactory);
    const downloadInfoAtom = context.registry.get(CustomComponentName.DownloadInfoAtom);
    const downloadStatisticsAtom = createDownloadStatisticsAtom(context, 25);
    const { state } = context.effects;

    createDownloadStatisticsApi(downloadStatisticsAtom, apiManager);
    context.registry.set(CustomComponentName.DownloadStatisticsAtom, downloadStatisticsAtom);
    state.subscribe(context, downloadInfoAtom, DownloadInfoSubscriber);
  },
  [ComponentName.CoreEffects, CustomComponentName.DownloadInfoAtom, ComponentName.CoreStateAtoms],
);

export default DownloadStatisticsPackage;
