import type { ApiManager } from '../../../types/framework/ApiManager';
import type { DownloadStatisticsApi } from './DownloadStatistics.package';
import type { DownloadStatisticsAtom } from './DownloadStatisticsAtom';

export const createDownloadStatisticsApi = (
  statisticsAtom: DownloadStatisticsAtom,
  apiManager: ApiManager<DownloadStatisticsApi>,
) => {
  apiManager.set('getAverageBytesPerSecond', () => statisticsAtom.averageBytesPerSecond);
  apiManager.set('getAverageTimeToFirstByte', () => statisticsAtom.averageTimeToFirstByte);
};
