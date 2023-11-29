import { createTask } from '@bitmovin/player-web-x/playerx-framework-utils';

import { CustomComponentName } from './CustomComponents';
import type { DownloadInfoAtom } from './DownloadInfoAtom';
import type { DownloadStatisticsContext } from './DownloadStatistics.package';

export const DownloadInfoSubscriber = createTask(
  'download-info-subscriber',
  (downloadInfo: DownloadInfoAtom, context: DownloadStatisticsContext) => {
    const downloadStatisticsAtom = context.registry.get(CustomComponentName.DownloadStatisticsAtom);

    if (downloadStatisticsAtom === undefined) {
      throw new Error('DownloadStatisticsAtom unexpectedly undefined');
    }

    context.effects.state.dispatch(downloadStatisticsAtom.addDownloadInfo, downloadInfo);
  },
);
