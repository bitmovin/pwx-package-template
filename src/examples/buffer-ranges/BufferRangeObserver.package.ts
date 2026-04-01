import type { ContextHaving } from '@bitmovin/player-web-x/framework-types/execution-context/Types';
import { createPackage } from '@bitmovin/player-web-x/playerx-framework-utils';
import type { CoreEffects, CoreExportNames } from '@bitmovin/player-web-x/types/packages/core/Types';
import type { StreamingState } from '@bitmovin/player-web-x/types/packages/streaming/Types';
import type { ContextWithState } from '@bitmovin/player-web-x/types/packages/Types';
import type { EmptyObject } from '@bitmovin/player-web-x/types/Types';

import { BufferRangeSubscriber } from './BufferRangeSubscriber';

type Dependencies = {
  [CoreExportNames.CoreEffects]: CoreEffects;
} & StreamingState;

type Exports = EmptyObject;

type Api = EmptyObject;

export type BufferRangeObserverContext = ContextHaving<Dependencies, Exports, ContextWithState>;

export const BufferRangeObserverPackage = createPackage<Dependencies, Exports, Api>(
  'buffer-range-observer-package',
  (_, baseContext) => {
    const { StateEffectFactory, EventListenerEffectFactory } = baseContext.registry.get('core-effects');
    const context = baseContext.using(StateEffectFactory).using(EventListenerEffectFactory);
    const streamingState = context.registry.get('streaming-state');
    const { state } = context.effects;

    state.subscribe(context, streamingState.dataRanges, BufferRangeSubscriber);
  },
  ['core-effects', 'streaming-state'],
);

export default BufferRangeObserverPackage;
