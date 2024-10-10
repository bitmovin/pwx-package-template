import type { EmptyObject } from '@bitmovin/player-web-x/framework-types/BaseTypes';
import { createPackage, createTask } from '@bitmovin/player-web-x/playerx-framework-utils';
import type { SubtitleFormatType } from '@bitmovin/player-web-x/types/packages/core/Constants';
import type { SubtitleFormatDetectionContext } from '@bitmovin/player-web-x/types/packages/subtitles/subtitle-format-detection/Types';

import type { FormatDetectionModifyDependencies, FormatDetectionModifyExports } from './Types';

const GetSegmentFormatTypeTask = createTask(
  'get-subtitle-segment-format-type',
  (data: Uint8Array, context: SubtitleFormatDetectionContext) => {
    const { arrayBufferToString } = context.registry.get('utils').TypedArrays;
    const { SubtitleFormatType: SubtitleFormatTypeEnum } = context.registry.get('constants');

    const subtitleSegmentData = arrayBufferToString(data).trim();
    if (subtitleSegmentData.startsWith('WEBVTT')) {
      return SubtitleFormatTypeEnum.WebVTT;
    }

    if (subtitleSegmentData.startsWith('<tt xml:')) {
      return 'ttml' as SubtitleFormatType;
    }

    return SubtitleFormatTypeEnum.Unknown;
  },
);

export const SubtitleFormatDetectionModifyPackage = createPackage<
  FormatDetectionModifyDependencies,
  FormatDetectionModifyExports,
  EmptyObject
>(
  'subtitle-format-detection-re-export',
  (_apiManager, context) => {
    context.registry.set('get-subtitle-segment-format-type-task', GetSegmentFormatTypeTask);
  },
  ['utils', 'constants'],
);

export default SubtitleFormatDetectionModifyPackage;
