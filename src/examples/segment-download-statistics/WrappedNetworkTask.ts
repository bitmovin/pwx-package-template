import { createTask } from '@bitmovin/player-web-x/playerx-framework-utils';
import type { NetworkAtom } from '@bitmovin/player-web-x/types/framework/core/core/network/NetworkAtom';
import type { NetworkTask } from '@bitmovin/player-web-x/types/framework/core/network/NetworkTask';
import type { BaseRequestConfig, HttpResponseType } from '@bitmovin/player-web-x/types/framework/core/network/Types';

import { CustomComponentName } from './CustomComponents';
import type { NetworkInspectorContext } from './NetworkInspector.package';

const WrapperIdentifierSymbol = Symbol();

export function hasWrappedTask(context: NetworkInspectorContext) {
  const networkTask = context.registry.get('network-task');

  return WrapperIdentifierSymbol in networkTask;
}

export const wrapNetworkTask = (context: NetworkInspectorContext): void => {
  const networkTask = context.registry.get('network-task');
  const downloadInfoAtom = context.registry.get(CustomComponentName.DownloadInfoAtom);

  if (downloadInfoAtom === undefined) {
    throw new Error('DownloadInfoAtom unexpectedly undefined');
  }

  const wrappedTask = createTask(
    'network-task-wrapper',
    async (data: [BaseRequestConfig<HttpResponseType>, NetworkAtom], context: NetworkInspectorContext) => {
      const state = context.effects.state;
      const response = await context.fork(networkTask, data);

      state.dispatch(downloadInfoAtom.trackDownload, response);

      return response;
    },
  ) as unknown as typeof NetworkTask;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (wrappedTask as any)[WrapperIdentifierSymbol] = 73;

  context.registry.set('network-task', wrappedTask);
};
