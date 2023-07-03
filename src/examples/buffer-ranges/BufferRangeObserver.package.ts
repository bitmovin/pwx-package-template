import type { EmptyObject } from '../../../types';
import type { SourceStateAtom } from '../../../types/atoms/SourceStateAtom';
import type { Logger } from '../../../types/components/Logger';
import type { ContextHaving, ContextWithState } from '../../../types/framework/ExecutionContext';
import type { CoreEffects } from '../../../types/packages/Core.package';
import { ComponentName } from '../../framework-exports/Components';
import { createPackage } from '../../framework-exports/Package';
import { BufferRangeSubscriber } from './BufferRangeSubscriber';

type Dependencies = {
  [ComponentName.Logger]: Logger;
  [ComponentName.CoreEffects]: CoreEffects;
  [ComponentName.SourceState]: SourceStateAtom;
};

type Exports = EmptyObject;

type Api = EmptyObject;

export type BufferRangeObserverContext = ContextHaving<Dependencies, Exports, ContextWithState>;

export const BufferRangeObserverPackage = createPackage<Dependencies, Exports, Api>(
  'buffer-range-observer-package',
  (apiManager, baseContext) => {
    const { StateEffectFactory } = baseContext.registry.get(ComponentName.CoreEffects);
    const context = baseContext.using(StateEffectFactory);
    const sourceState = context.registry.get(ComponentName.SourceState);
    const { state } = context.effects;

    state.subscribe(context, sourceState.dataRanges.renderedRanges, BufferRangeSubscriber);
  },
  [ComponentName.CoreEffects, ComponentName.SourceState],
);

export default BufferRangeObserverPackage;
