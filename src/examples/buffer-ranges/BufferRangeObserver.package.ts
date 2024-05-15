import type { ContextHaving } from '@bitmovin/player-web-x/framework-types/execution-context/Types';
import { createPackage } from '@bitmovin/player-web-x/playerx-framework-utils';
import type { BundleExportNames } from '@bitmovin/player-web-x/types/bundles/Types';
import type { CoreEffects, CoreExportNames } from '@bitmovin/player-web-x/types/packages/core/Types';
import type { Logger } from '@bitmovin/player-web-x/types/packages/core/utils/Logger';
import type { SourceStateAtom } from '@bitmovin/player-web-x/types/packages/source/atoms/SourceStateAtom';
import type { SourceExportNames } from '@bitmovin/player-web-x/types/packages/source/Types';
import type { ContextWithState } from '@bitmovin/player-web-x/types/packages/Types';
import type { EmptyObject } from '@bitmovin/player-web-x/types/Types';

import { BufferRangeSubscriber } from './BufferRangeSubscriber';

type Dependencies = {
  [BundleExportNames.Logger]: Logger;
  [CoreExportNames.CoreEffects]: CoreEffects;
  [SourceExportNames.SourceState]: SourceStateAtom;
};

type Exports = EmptyObject;

type Api = EmptyObject;

export type BufferRangeObserverContext = ContextHaving<Dependencies, Exports, ContextWithState>;

export const BufferRangeObserverPackage = createPackage<Dependencies, Exports, Api>(
  'buffer-range-observer-package',
  (_, baseContext) => {
    const { StateEffectFactory, EventListenerEffectFactory } = baseContext.registry.get('core-effects');
    const context = baseContext.using(StateEffectFactory).using(EventListenerEffectFactory);
    const sourceState = context.registry.get('source-state-atom');
    const { state } = context.effects;

    state.subscribe(context, sourceState.dataRanges, BufferRangeSubscriber);
  },
  ['core-effects', 'source-state-atom'],
);

export default BufferRangeObserverPackage;
