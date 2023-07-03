import type { DownloadInfo, DownloadInfoAtom } from './DownloadInfoAtom';
import type { DownloadStatisticsContext } from './DownloadStatistics.package';

type DownloadStatistics = {
  downloadInfos: DownloadInfo[];
  historyLength: number;
  averageBytesPerSecond: number;
  averageTimeToFirstByte: number;
};

function createDefaultDownloadStatistics(historyLength: number): DownloadStatistics {
  return {
    historyLength,
    averageBytesPerSecond: -1,
    averageTimeToFirstByte: -1,
    downloadInfos: [],
  };
}

function updateStatistics(statistics: DownloadStatistics) {
  const numSamples = statistics.downloadInfos.length;
  const sumBytes = statistics.downloadInfos.reduce((totalBytes, info) => totalBytes + info.size, 0);
  const sumDownloadTime = statistics.downloadInfos.reduce(
    (totalDownloadTime, info) => totalDownloadTime + info.downloadDuration,
    0,
  );
  const sumTimeToFirstByte = statistics.downloadInfos.reduce(
    (totalTimeToFirstByte, info) => totalTimeToFirstByte + info.timeToFirstByte,
    0,
  );

  statistics.averageBytesPerSecond = sumBytes / sumDownloadTime;
  statistics.averageTimeToFirstByte = sumTimeToFirstByte / numSamples;
}

function addDownloadInfo(statistics: DownloadStatistics, downloadInfo: DownloadInfoAtom) {
  statistics.downloadInfos.push({
    size: downloadInfo.size,
    timeToFirstByte: downloadInfo.timeToFirstByte,
    downloadDuration: downloadInfo.downloadDuration,
  });

  while (statistics.downloadInfos.length > statistics.historyLength) {
    statistics.downloadInfos.shift();
  }

  updateStatistics(statistics);

  return true;
}

export type DownloadStatisticsAtom = ReturnType<typeof createDownloadStatisticsAtom>;

export const createDownloadStatisticsAtom = (context: DownloadStatisticsContext, historyLength: number) => {
  return context.effects.state.create(createDefaultDownloadStatistics(historyLength), { addDownloadInfo });
};
