import type { Constants } from '@bitmovin/player-web-x/types/packages/core/Constants';
import type { CoreExportNames } from '@bitmovin/player-web-x/types/packages/core/Types';
import type { CoreUtils } from '@bitmovin/player-web-x/types/packages/core/utils/Types';
import type {
  GetSegmentFormatTypeTaskType,
  SubtitleFormatDetectionExportNames,
} from '@bitmovin/player-web-x/types/packages/subtitles/subtitle-format-detection/Types';

export type FormatDetectionModifyDependencies = {
  [CoreExportNames.Utils]: CoreUtils;
  [CoreExportNames.Constants]: Constants;
};

export type FormatDetectionModifyExports = {
  [SubtitleFormatDetectionExportNames.GetSegmentFormatTypeTask]: GetSegmentFormatTypeTaskType;
};
