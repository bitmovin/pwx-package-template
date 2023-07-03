import type { NetworkAtom } from '../../../types/atoms/NetworkAtom';
import type { BaseRequestConfig, HttpResponseType, NetworkPipeline } from '../../../types/components/NetworkPipeline';
import { ComponentName } from '../../framework-exports/Components';
import { createPipeline } from '../../framework-exports/Pipeline';
import { CustomComponentName } from './CustomComponents';
import type { NetworkInspectorContext } from './NetworkInspector.package';

const WrapperIdentifierSymbol = Symbol();

export function hasWrappedPipeline(context: NetworkInspectorContext) {
  const networkPipeline = context.registry.get(ComponentName.NetworkPipeline);

  return WrapperIdentifierSymbol in networkPipeline;
}

export const wrapNetworkPipeline = (context: NetworkInspectorContext): void => {
  const networkPipeline = context.registry.get(ComponentName.NetworkPipeline);
  const downloadInfoAtom = context.registry.get(CustomComponentName.DownloadInfoAtom);

  if (downloadInfoAtom === undefined) {
    throw new Error('DownloadInfoAtom unexpectedly undefined');
  }

  const wrappedPipeline = createPipeline(
    'network-pipeline-wrapper',
    async (data: [BaseRequestConfig<HttpResponseType>, NetworkAtom], context: NetworkInspectorContext) => {
      const state = context.effects.state;
      const response = await context.fork(networkPipeline, data);

      state.dispatch(downloadInfoAtom.trackDownload, response);

      return response;
    },
  ) as unknown as typeof NetworkPipeline;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (wrappedPipeline as any)[WrapperIdentifierSymbol] = 73;

  context.registry.set(ComponentName.NetworkPipeline, wrappedPipeline);
};
