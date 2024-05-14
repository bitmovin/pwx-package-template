import { createTaskClosure } from '@bitmovin/player-web-x/playerx-framework-utils';
import type { NetworkAtom } from '@bitmovin/player-web-x/types/framework/core/core/network/NetworkAtom';
import type { NetworkPackageContext } from '@bitmovin/player-web-x/types/framework/core/network/Network.package';
import type { NetworkTask } from '@bitmovin/player-web-x/types/framework/core/network/NetworkTask';
import type { BaseRequestConfig, HttpResponseType } from '@bitmovin/player-web-x/types/framework/core/network/Types';

import { CustomComponentName } from './CustomComponents';
import type { NetworkInspectorContext } from './NetworkInspector.package';

export const wrapNetworkTask = (context: NetworkInspectorContext): void => {
  const downloadInfoAtom = context.registry.get(CustomComponentName.DownloadInfoAtom);

  if (downloadInfoAtom === undefined) {
    throw new Error('DownloadInfoAtom unexpectedly undefined');
  }

  const WrappedNetworkTaskClosure = createTaskClosure((originalNetworkTask: typeof NetworkTask) => [
    'network-task-wrapper',
    async (data: [BaseRequestConfig<HttpResponseType>, NetworkAtom | undefined], context: NetworkPackageContext) => {
      const state = context.effects.state;
      const response = await context.fork(originalNetworkTask, data);

      state.dispatch(downloadInfoAtom.trackDownload, response);

      return response;
    },
  ]);

  context.registry.addReplacer('network-task', WrappedNetworkTaskClosure);
};
