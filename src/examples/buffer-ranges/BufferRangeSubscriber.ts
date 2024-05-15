import { createTask } from '@bitmovin/player-web-x/playerx-framework-utils';
import type { MediaType } from '@bitmovin/player-web-x/types/packages/core/Constants';
import type { DataRangesAtom } from '@bitmovin/player-web-x/types/packages/core/state/data-ranges/DataRangesAtom';
import type { TimeRange } from '@bitmovin/player-web-x/types/packages/core/state/track/TrackAtom';

import type { BufferRangeObserverContext } from './BufferRangeObserver.package';

function stringifyTimeRanges(ranges: readonly TimeRange[]): string {
  if (ranges.length === 0) {
    return '[]';
  }

  return (
    '\n' + ranges.map((range, index) => `\t[${index}]: ${range.start.toFixed(2)} - ${range.end.toFixed(2)}`).join('\n')
  );
}

function prettyPrintBufferRanges(ranges: DataRangesAtom) {
  const rangeStrings = [] as string[];
  const mediaIds = Object.keys(ranges.media);

  for (const mediaId of mediaIds) {
    const mediaType = mediaId.split(':')[0] as MediaType;
    const rangesOfType = ranges.media[mediaId].ranges;

    rangeStrings.push(`${mediaType}${stringifyTimeRanges(rangesOfType)}`);
  }

  return rangeStrings.join('\n');
}

export const BufferRangeSubscriber = createTask(
  'buffer-range-observer',
  (ranges: DataRangesAtom, context: BufferRangeObserverContext) => {
    const logger = context.registry.get('logger');

    logger.warn(`Buffered ranges:\n${prettyPrintBufferRanges(ranges)}`);
  },
);
