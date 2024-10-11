import type { EmptyObject } from '@bitmovin/player-web-x/framework-types/BaseTypes';
import { createPackage } from '@bitmovin/player-web-x/playerx-framework-utils';

import { StreamTimelineSubscribeTask } from './SubscribeAndParse';
import type { TTMLDependencies, TTMLExports } from './Types';

const TtmlPackage = createPackage<TTMLDependencies, TTMLExports, EmptyObject>(
  'ttml-package',
  (_, baseContext) => {
    const { StateEffectFactory, EventListenerEffectFactory } = baseContext.registry.get('core-effects');
    const context = baseContext.using(StateEffectFactory, EventListenerEffectFactory);

    const streamTimeline = context.registry.get('stream-timeline');
    const { mapSubscribe } = context.registry.get('utils').State;

    // Map subscribe on stream timeline to drill down to segments
    mapSubscribe(context, streamTimeline, StreamTimelineSubscribeTask);
  },
  [
    'core-state-atoms',
    'core-effects',
    'subtitle-cue-map-atom',
    'create-subtitle-cue-map-atom',
    'source-state-atom',
    'stream-timeline',
  ],
);

export default TtmlPackage;
