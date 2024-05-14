import type { ContextHaving } from '@bitmovin/player-web-x/framework-types/execution-context/Types';
import { createPackage } from '@bitmovin/player-web-x/playerx-framework-utils';
import type { EmptyObject } from '@bitmovin/player-web-x/types/BaseTypes';
import type { CoreEffects } from '@bitmovin/player-web-x/types/framework/core/core/Core.package';
import type { CoreUtils } from '@bitmovin/player-web-x/types/framework/core/core/utils/Types';
import type { NetworkTask } from '@bitmovin/player-web-x/types/framework/core/network/NetworkTask';
import type { ContextWithState } from '@bitmovin/player-web-x/types/framework/core/Types';
import type { ComponentName } from '@bitmovin/player-web-x/types/framework/Types';

import { CustomComponentName } from './CustomComponents';
import type { DownloadInfoAtom } from './DownloadInfoAtom';
import { createDownloadInfoAtom } from './DownloadInfoAtom';
import { wrapNetworkTask } from './WrappedNetworkTask';

type Dependencies = {
  [ComponentName.Utils]: CoreUtils;
  [ComponentName.CoreEffects]: CoreEffects;
};

type Exports = {
  [ComponentName.NetworkTask]: typeof NetworkTask;
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
