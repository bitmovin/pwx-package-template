import { createTask, createTaskClosure } from '@bitmovin/player-web-x/playerx-framework-utils';
import type { SubtitleFormatType } from '@bitmovin/player-web-x/types/packages/core/Constants';
import type { ArrayAtom } from '@bitmovin/player-web-x/types/packages/core/state/ArrayStateAtom';
import type { PrimitiveAtom } from '@bitmovin/player-web-x/types/packages/core/state/PrimitiveAtom';
import type { DataOrSelfInitSegmentAtom } from '@bitmovin/player-web-x/types/packages/core/state/segment/SegmentAtom';
import type {
  SelectionGroupAtom,
  SubtitleSelectionGroupAtom,
} from '@bitmovin/player-web-x/types/packages/core/state/selection-group/SelectionGroupAtom';
import type { StreamSectionAtom } from '@bitmovin/player-web-x/types/packages/core/state/stream-timeline/StreamSectionAtom';
import type { SubtitleCueAtom } from '@bitmovin/player-web-x/types/packages/subtitles/subtitle-base/SubtitleCueAtom';

import type { TTMLPackageContext } from './Types';

export const StreamTimelineSubscribeTask = createTask(
  'stream-timeline-subscribe',
  (streamSection: StreamSectionAtom, context: TTMLPackageContext) => {
    const { mapSubscribe } = context.registry.get('utils').State;
    // timeline can have multiple sequences we need to subscribe to
    mapSubscribe(context, streamSection.streamSequenceMap, StreamSequenceSubscribeTask);

    // Ensure task does not end until aborted explicitly - otherwise it will unsubscribe
    return context.effects.loop(context.abortSignal);
  },
);

const StreamSequenceSubscribeTask = createTask(
  'stream-sequence-map-subscribe',
  (
    [selectionGroup, segments]: [SelectionGroupAtom, ArrayAtom<DataOrSelfInitSegmentAtom>],
    context: TTMLPackageContext,
  ) => {
    const subtitleCueMapAtom = context.registry.get('subtitle-cue-map-atom');
    const {
      createTimelineAtom,
      SelectionGroups: { isSubtitleSelectionGroup },
    } = context.registry.get('core-state-atoms');
    const { subscribeAndRun } = context.registry.get('utils').State;

    // Ensure we are working only with subtitle selection groups
    if (isSubtitleSelectionGroup(selectionGroup)) {
      if (!subtitleCueMapAtom.has(selectionGroup)) {
        // Add subtitle selection group to subtitleCueMapAtom and create timeline for it
        context.effects.state.dispatch(subtitleCueMapAtom.add, selectionGroup, createTimelineAtom(context));
      }

      const firstTrack = selectionGroup.tracks[0];

      if (firstTrack) {
        // We might not have format type yet - we use subscribeAndRun
        subscribeAndRun(context, firstTrack.formatType, FormatTypeSubscribeTask(selectionGroup, segments));

        // Ensure task does not end until aborted explicitly - otherwise it will unsubscribe
        return context.effects.loop(context.abortSignal);
      }
    }

    return undefined;
  },
);

const FormatTypeSubscribeTask = createTaskClosure(
  (selectionGroup: SubtitleSelectionGroupAtom, segments: ArrayAtom<DataOrSelfInitSegmentAtom>) => [
    'track-format-type-subscribe',
    (formatType: PrimitiveAtom<SubtitleFormatType>, context: TTMLPackageContext): Promise<void> | void => {
      const { subscribeAndRun } = context.registry.get('utils').State;

      // Check if format type is the one we want to parse
      if (formatType.value === ('ttml' as SubtitleFormatType)) {
        // Subscribe on segments to run parser on
        subscribeAndRun(context, segments, SegmentSubscribeTask(selectionGroup));

        // Ensure task does not end until aborted explicitly - otherwise it will unsubscribe
        return context.effects.loop(context.abortSignal);
      }
    },
  ],
);

const SegmentSubscribeTask = createTaskClosure((selectionGroup: SubtitleSelectionGroupAtom) => [
  'ttml-segments-subscribe',
  (segments: ArrayAtom<DataOrSelfInitSegmentAtom>, context: TTMLPackageContext) => {
    const subtitleCueMapAtom = context.registry.get('subtitle-cue-map-atom');
    const selectionGroupCues = subtitleCueMapAtom.get(selectionGroup);
    if (!selectionGroupCues) {
      return;
    }

    for (const segment of segments) {
      // We should use some kind of cache to ensure we dont parse same segment multiple times
      const cues = getCues(context, segment);
      context.effects.state.dispatch(selectionGroupCues.add, ...cues);
    }
  },
]);

function getCues(_context: TTMLPackageContext, _segment: DataOrSelfInitSegmentAtom): SubtitleCueAtom[] {
  // Parse cues and use createSubtitleCueAtom
  return [];
}
