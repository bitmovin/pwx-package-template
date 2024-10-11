As of version 10.1.3, the PWX has added support for subtitles - currently supporting WebVTT format out of the box which will get extended in the future. As with many features of the player, subtitles can also be modified and extended, and this example shows how to add additional format type support.

# Subtitle packages

The `SubtitlesPackage` is a collection of multiple packages:

- `SubtitleBasePackage` 
- `SubtitleFormatDetectionPackage`
- `SubtitleNativeRendererPackage`
- `SubtitleApiPackage`
- `WebVttPackage`

### SubtitleBasePackage

Exposes `SubtitleCueMapAtom` and `CreateSubtitleCueAtom` . 
The `SubtitleCueMapAtom` holds all the subtitle cues, and it is populated by format specific packages. This is the core of subtitles together with `CreateSubtitleCueAtom` to ensure all the cues are in the common place and using common interface. The `CreateSubtitleCueAtom` is used by format specific packages, to create cues with common interface.
Besides exposing core requirements for subtitle support, it is also responsible for removal of subtitle cues once we played over them from `SubtitleCueMapAtom`, and clearing of subtitle segments from `StreamTimeline` (This is prone to change in the future).

### SubtitleFormatDetectionPackage

Exposes `GetSegmentFormatTypeTask` and it is responsible for checking loaded segments data and detecting what subtitle format is used and assigns it to the segment subtitle track `formatType`. 
`GetSegmentFormatTypeTask` takes `Uint8Array` and is expected to return `SubtitleFormatType` - anything but `SubtitleFormatType.Unknown` will then be assigned to segment track.
This step is required so other format specific packages can run for correct subtitle tracks. For e.g. `WebVtt` package will only handle those segments of subtitle tracks that have `formatType` set to `SubtitleFormatType.WebVTT`.

### SubtitleNativeRendererPackage

Handles all the logic for creating and removing native text tracks, populating them with its cues, and mapping states if track is active - native to framework and vice versa. Note this package is not responsible for dispatching the events.

### SubtitleApiPackage

Exposes `subtitles` API on `source` API - sets correct expected states based on API calls and handles all the subtitle and cue events. All of these events are dispatched based of `SourceState.stream.selectionGroups` , `SourceState.activeMediaTypes` and `SubtitleCueMapAtom`.

### WebVttPackage

Adds subscribers to `StreamTimeline` to drill down to WebVTT subtitle segments present, parses its content, and sets cues to `SubtitleCueMapAtom`.  It has internal cache for parsed segments to ensure no duplicate cues are set.

# Adding new format support

When adding support for new format, we only need to ensure correct format is set on track, and that we parse and set cues. Loading of the subtitle tracks (its segments) is handled internally, and all the events regarding the cues and subtitles are handled by SubtitleApi package.
To support additional format, we need to add our custom format package, and set `GetSegmentFormatTypeTask` to provide correct type - this should still ensure other format types are still supported. Next step requires creating package that will handle these subtitle tracks and its segments, parsing them and setting cues on `SubtitleCueMapAtom` for the rest of the subtitle implementation to use. 

### Modifying subtitle format detection

We can simply replace `GetSegmentFormatTypeTask` with custom implementation and set it on registry. This package will have to be added before we load any sources to ensure it is set before being used. Detecting subtitle format and updating of `GetSegmentFormatTypeTask` can be seen in `format-detection` folder. We should still ensure rest of the subtitle formats (the ones the player already supports) are still supported.

### Adding your own subtitle format parser

Once the `formatType` is assigned to subtitle track, we can subscribe drill down the `StreamTimeline` to the correct subtitle selection group (checking `selectionGroup.track.formatType`). From there, we can subscribe on its segments, parse their data and extract the cues. We create cues using `createSubtitleCueAtom` and set them on `SubtitleCueMapAtom`. This part is covered in `ttml` package. We can either use `subscribeMap` on segments, or some kind of local cache, to ensure that we don't double parse the segments and create same cues twice.