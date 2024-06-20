import type { EmptyObject } from '@bitmovin/player-web-x/framework-types/BaseTypes';
import type { ContextHaving } from '@bitmovin/player-web-x/framework-types/execution-context/Types';
import type { PrimitiveAtom } from '@bitmovin/player-web-x/types/packages/core/state/PrimitiveAtom';
import type { CoreExportNames, CoreStateAtoms } from '@bitmovin/player-web-x/types/packages/core/Types';
import type { ContextWithState } from '@bitmovin/player-web-x/types/packages/Types';

export type EncryptionData = {
  key: ArrayBuffer;
  iv: ArrayBuffer;
};

export type EncryptionDataAtom = PrimitiveAtom<EncryptionData | undefined>;

type ContextT = ContextHaving<{ [CoreExportNames.CoreStateAtoms]: CoreStateAtoms }, EmptyObject, ContextWithState>;

// A `PrimitiveAtom` that holds the information needed to decrypt a segment.
export function createEncryptionDataAtom(context: ContextT) {
  const { createPrimitiveAtom } = context.registry.get('core-state-atoms');

  return createPrimitiveAtom<EncryptionData | undefined>(context, undefined);
}
