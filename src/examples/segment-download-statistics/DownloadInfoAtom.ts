import type { HttpResponse, HttpResponseType } from '../../../types/components/NetworkPipeline';
import type { ContextWithState } from '../../../types/framework/ExecutionContext';

export type DownloadInfo = {
  size: number;
  downloadDuration: number;
  timeToFirstByte: number;
};

function createDefaultDownloadInfo(): DownloadInfo {
  return {
    size: -1,
    downloadDuration: -1,
    timeToFirstByte: -1,
  };
}

function trackDownload(downloadInfo: DownloadInfo, response: HttpResponse<HttpResponseType>) {
  const { openedTimestamp, doneTimestamp, headersReceivedTimestamp } = response.timingInformation;

  if (
    response.status < 200 ||
    response.status >= 300 ||
    openedTimestamp <= 0 ||
    doneTimestamp <= 0 ||
    headersReceivedTimestamp <= 0
  ) {
    return false;
  }

  const downloadDuration = (doneTimestamp - headersReceivedTimestamp) / 1000;
  const timeToFirstByte = (headersReceivedTimestamp - openedTimestamp) / 1000;

  downloadInfo.size = response.length;
  downloadInfo.downloadDuration = downloadDuration;
  downloadInfo.timeToFirstByte = timeToFirstByte;

  return true;
}

export type DownloadInfoAtom = ReturnType<typeof createDownloadInfoAtom>;

export const createDownloadInfoAtom = (context: ContextWithState) => {
  return context.effects.state.create(createDefaultDownloadInfo(), { trackDownload });
};
