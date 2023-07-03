import type { RenderedRangesAtom, TimeRange } from '../../../types/atoms/SourceStateAtom';
import { ComponentName } from '../../framework-exports/Components';
import { createPipeline } from '../../framework-exports/Pipeline';
import type { BufferRangeObserverContext } from './BufferRangeObserver.package';

function stringifyTimeRanges(ranges: TimeRange[]): string {
  if (ranges.length === 0) {
    return '[]';
  }

  return (
    '\n' + ranges.map((range, index) => `\t[${index}]: ${range.start.toFixed(2)} - ${range.end.toFixed(2)}`).join('\n')
  );
}

function prettyPrintBufferRanges(ranges: RenderedRangesAtom) {
  const rangeTypes = ['audio', 'video', 'subtitles', 'thumbnails'] as const;
  const rangeStrings = [] as string[];

  for (const rangeType of rangeTypes) {
    if (!(rangeType in ranges)) {
      continue;
    }

    rangeStrings.push(`${rangeType}${stringifyTimeRanges(ranges[rangeType] ?? [])}`);
  }

  return rangeStrings.join('\n');
}

export const BufferRangeSubscriber = createPipeline(
  'buffer-range-observer',
  (ranges: RenderedRangesAtom, context: BufferRangeObserverContext) => {
    const logger = context.registry.get(ComponentName.Logger);

    logger.warn(`Buffered ranges:\n${prettyPrintBufferRanges(ranges)}`);
  },
);
