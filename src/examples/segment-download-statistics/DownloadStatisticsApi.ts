import type { ApiManager } from '@bitmovin/player-web-x/framework-types/api-manager/ApiManager';

import type { DownloadStatisticsApi } from './DownloadStatistics.package';
import type { DownloadStatisticsAtom } from './DownloadStatisticsAtom';

export const createDownloadStatisticsApi = (
  statisticsAtom: DownloadStatisticsAtom,
  apiManager: ApiManager<DownloadStatisticsApi>,
) => {
  apiManager.set('getAverageBytesPerSecond', () => statisticsAtom.averageBytesPerSecond);
  apiManager.set('getAverageTimeToFirstByte', () => statisticsAtom.averageTimeToFirstByte);
};
