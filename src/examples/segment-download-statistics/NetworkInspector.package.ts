import type { ContextHaving } from '@bitmovin/player-web-x/framework-types/execution-context/Types';
import { createPackage } from '@bitmovin/player-web-x/playerx-framework-utils';
import type { CoreEffects, CoreExportNames } from '@bitmovin/player-web-x/types/packages/core/Types';
import type { CoreUtils } from '@bitmovin/player-web-x/types/packages/core/utils/Types';
import type { NetworkTask } from '@bitmovin/player-web-x/types/packages/network/NetworkTask';
import type { NetworkExportNames } from '@bitmovin/player-web-x/types/packages/network/Types';
import type { ContextWithState } from '@bitmovin/player-web-x/types/packages/Types';
import type { EmptyObject } from '@bitmovin/player-web-x/types/Types';

import { CustomComponentName } from './CustomComponents';
import type { DownloadInfoAtom } from './DownloadInfoAtom';
import { createDownloadInfoAtom } from './DownloadInfoAtom';
import { wrapNetworkTask } from './WrappedNetworkTask';

type Dependencies = {
  [CoreExportNames.Utils]: CoreUtils;
  [CoreExportNames.CoreEffects]: CoreEffects;
};

type Exports = {
  [NetworkExportNames.NetworkTask]: typeof NetworkTask;
  [CustomComponentName.DownloadInfoAtom]: DownloadInfoAtom;
};

export type NetworkInspectorContext = ContextHaving<Dependencies, Exports, ContextWithState>;

export const NetworkInspectorPackage = createPackage<Dependencies, Exports, EmptyObject>(
  'network-inspector-package',
  (_, baseContext) => {
    const { StateEffectFactory, EventListenerEffectFactory } = baseContext.registry.get('core-effects');
    const context = baseContext.using(StateEffectFactory).using(EventListenerEffectFactory);
    const downloadInfoAtom = createDownloadInfoAtom(context);

    context.registry.set(CustomComponentName.DownloadInfoAtom, downloadInfoAtom);

    wrapNetworkTask(context);
  },
  ['core-effects', 'utils'],
);

export default NetworkInspectorPackage;
