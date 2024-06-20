import { createPackage } from '@bitmovin/player-web-x/playerx-framework-utils';
import type { EmptyObject } from '@bitmovin/player-web-x/types/Types';

import { BackendRequestTask } from './BackendRequestTask';
import { createDecryptorProcessor } from './DecryptorProcessor';
import { createEncryptionDataAtom } from './EncryptionDataAtom';
import type { SegmentDecryptorPackageDependencies, SegmentDecryptorPackageExports } from './Types';

// This package does two things:
//  - it executes a `BackendRequestTask` that fetches some
//    stream-specific encryption info from a backend and
//  - it adds a `SegmentDecryptor` processor to the processing
//    component that waits for the encryption data to be
//    fetched from the backend and decrypts every segment,
//    when the decryption data is available
//
// The package will be executed once for every source, so
// the backend request will also be sent once per source.
// However, the decryptor processor will be executed for
// every segment as it is being downloaded.
export const SegmentDecryptionPackage = createPackage<
  SegmentDecryptorPackageDependencies,
  SegmentDecryptorPackageExports,
  EmptyObject
>(
  'segment-decryption-package',
  (_, baseContext) => {
    const { StateEffectFactory, EventListenerEffectFactory } = baseContext.registry.get('core-effects');
    const context = baseContext.using(StateEffectFactory, EventListenerEffectFactory);
    const encryptionDataAtom = createEncryptionDataAtom(context);
    const decryptorProcessor = createDecryptorProcessor(context, encryptionDataAtom);
    const segmentProcessingComponent = context.registry.get('segment-processing-component');

    segmentProcessingComponent.addProcessor(decryptorProcessor);
    context.fork(BackendRequestTask, encryptionDataAtom);
  },
  [
    'utils',
    'logger',
    'core-effects',
    'core-state-atoms',
    'segment-processor-type',
    'segment-processing-component',
    'network-task',
    'metrics',
  ],
);

export default SegmentDecryptionPackage;
