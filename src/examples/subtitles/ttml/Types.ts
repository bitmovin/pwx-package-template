import type { EmptyObject } from '@bitmovin/player-web-x/framework-types/BaseTypes';
import type { ContextHaving } from '@bitmovin/player-web-x/framework-types/execution-context/Types';
import type { Constants } from '@bitmovin/player-web-x/types/packages/core/Constants';
import type { StreamTimelineAtom } from '@bitmovin/player-web-x/types/packages/core/state/stream-timeline/StreamTimelineMapAtom';
import type { CoreEffects, CoreExportNames, CoreStateAtoms } from '@bitmovin/player-web-x/types/packages/core/Types';
import type { CoreUtils } from '@bitmovin/player-web-x/types/packages/core/utils/Types';
import type { DataExportNames } from '@bitmovin/player-web-x/types/packages/data/Types';
import type { SourceStateAtom } from '@bitmovin/player-web-x/types/packages/source/atoms/SourceStateAtom';
import type { SourceExportNames } from '@bitmovin/player-web-x/types/packages/source/Types';
import type { createSubtitleCueAtom } from '@bitmovin/player-web-x/types/packages/subtitles/subtitle-base/SubtitleCueAtom';
import type { SubtitleCueMapAtom } from '@bitmovin/player-web-x/types/packages/subtitles/subtitle-base/SubtitleCueMapAtom';
import type { SubtitleBaseExportNames } from '@bitmovin/player-web-x/types/packages/subtitles/subtitle-base/Types';
import type { ContextWithState } from '@bitmovin/player-web-x/types/packages/Types';

export type TTMLDependencies = {
  [CoreExportNames.CoreStateAtoms]: CoreStateAtoms;
  [CoreExportNames.Utils]: CoreUtils;
  [CoreExportNames.CoreEffects]: CoreEffects;
  [CoreExportNames.Constants]: Constants;
  [SubtitleBaseExportNames.SubtitleCueMapAtom]: SubtitleCueMapAtom;
  [SubtitleBaseExportNames.CreateSubtitleCueAtom]: typeof createSubtitleCueAtom;
  [SourceExportNames.SourceState]: SourceStateAtom;
  [DataExportNames.StreamTimeline]: StreamTimelineAtom;
};
export type TTMLExports = EmptyObject;

export type TTMLPackageContext = ContextHaving<TTMLDependencies, TTMLExports, ContextWithState>;
