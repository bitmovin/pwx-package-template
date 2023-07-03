import type { EmptyObject } from '../../../types';
import type { CoreUtils } from '../../../types/components/CoreUtils';
import type { NetworkPipeline } from '../../../types/components/NetworkPipeline';
import type { ContextHaving, ContextWithState } from '../../../types/framework/ExecutionContext';
import type { CoreEffects } from '../../../types/packages/Core.package';
import { ComponentName } from '../../framework-exports/Components';
import { createPackage } from '../../framework-exports/Package';
import { CustomComponentName } from './CustomComponents';
import type { DownloadInfoAtom } from './DownloadInfoAtom';
import { createDownloadInfoAtom } from './DownloadInfoAtom';
import { hasWrappedPipeline, wrapNetworkPipeline } from './WrappedNetworkPipeline';

type Dependencies = {
  [ComponentName.Utils]: CoreUtils;
  [ComponentName.CoreEffects]: CoreEffects;
  [ComponentName.NetworkPipeline]: typeof NetworkPipeline;
};

type Exports = {
  [ComponentName.NetworkPipeline]: typeof NetworkPipeline;
  [CustomComponentName.DownloadInfoAtom]: DownloadInfoAtom;
};

export type NetworkInspectorContext = ContextHaving<Dependencies, Exports, ContextWithState>;

export const NetworkInspectorPackage = createPackage<Dependencies, Exports, EmptyObject>(
  'network-inspector-package',
  (apiManager, baseContext) => {
    const { StateEffectFactory } = baseContext.registry.get(ComponentName.CoreEffects);
    const context = baseContext.using(StateEffectFactory);

    if (hasWrappedPipeline(context)) {
      return;
    }

    const downloadInfoAtom = createDownloadInfoAtom(context);

    context.registry.set(CustomComponentName.DownloadInfoAtom, downloadInfoAtom);
    wrapNetworkPipeline(context);
  },
  [ComponentName.CoreEffects, ComponentName.Utils, ComponentName.NetworkPipeline],
);

export default NetworkInspectorPackage;
