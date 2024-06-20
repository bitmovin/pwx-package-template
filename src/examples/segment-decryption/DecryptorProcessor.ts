import { createTask } from '@bitmovin/player-web-x/playerx-framework-utils';
import type {
  SegmentDecryptor,
  SegmentDecryptorData,
  SegmentProcessorContext,
} from '@bitmovin/player-web-x/types/packages/segment-processing/Types';

import { decrypt } from './Decryption';
import type { EncryptionData, EncryptionDataAtom } from './EncryptionDataAtom';
import type { SegmentDecryptorPackageContext } from './Types';

// A task that waits for the encryption data to become
// available. Will resolve immediately, if the data is
// already available and will block until it is otherwise.
const WaitForEncryptionData = createTask(
  'payload-awaiter',
  async (payload: EncryptionDataAtom, context: SegmentProcessorContext) => {
    const { effects, fork } = context;
    const { abortable, state } = effects;

    return abortable<EncryptionData>(resolve => {
      const subscriber = createTask(
        'payload-subscriber',
        ({ value }: EncryptionDataAtom, _: SegmentProcessorContext) => {
          if (value !== undefined) {
            resolve(value);
            unsubscribe();
          }
        },
      );

      const unsubscribe = state.subscribe(context, payload, subscriber);
      fork(subscriber, payload);
    });
  },
);

// Creates a `SegmentDecryptor` processor that takes `Uint8Array`
// network chunks as an input, decrypts those chunks and provides
// decrypted `Uint8Array` chunks as an output.
export function createDecryptorProcessor(
  context: SegmentDecryptorPackageContext,
  encryptionDataAtom: EncryptionDataAtom,
) {
  // Segment processors come in different types - the one
  // implemented here is a `Decryptor` processor.
  const SegmentProcessorType = context.registry.get('segment-processor-type');

  // Each segment processor is executing a task that is provided
  // with the segment processor data. The shape of that data
  // depends on the type of the processor, but every processor
  // gets reads from an `input` and writes to an `output`.
  // In the case of a decryptor processor, both the input and the
  // output are `Uint8Array`s.
  const decryptorProcessor = createTask(
    'decryptor-processor',
    async (data: SegmentDecryptorData, context: SegmentProcessorContext) => {
      const { state } = context.effects;
      const { merge } = context.registry.get('utils').TypedArrays;
      const { getReadableSegmentName } = context.registry.get('core-state-atoms').Segments;
      const chunks: Uint8Array[] = [];
      const { blue, cyan, bold } = context.registry.get('utils').AnsiEscapeSequences;
      const logPrefix = `[${bold(blue('Decryption'))}] `;
      const segmentName = bold(cyan(getReadableSegmentName(data.segment, 1)));
      const logger = context.registry.get('logger');

      logger.log(logPrefix + `Reading chunks for "${segmentName}"...`);

      // It is possible to consume input data on a chunk-by-chunk
      // basis, but for simplicity we will collect all chunks and
      // merge them before starting the decryption process.
      for await (const chunk of data.input) {
        chunks.push(chunk);
      }

      logger.log(logPrefix + `Chunks for "${segmentName}" read, waiting for decryption data...`);

      const mergedData = merge(chunks);

      // Once all chunks were loaded and merged, we need to ensure
      // that the information needed to decrypt those segments is
      // available. We do this by waiting for the
      // `EncryptionDataAtom` to be populated with data by the
      // `BackendRequestTask` that is running in the background.
      const encryptionData = await context.fork(WaitForEncryptionData, encryptionDataAtom);

      logger.log(logPrefix + `Encryption data received, decrypting "${segmentName}"...`);

      // Once the encryption data is available, we can decrypt
      // the data.
      const decryptedData = await decrypt(mergedData, encryptionData);

      logger.log(logPrefix + `"${segmentName}" decrypted`);

      // Finally, we write the decrypted data to the output, which
      // will allow the processing component to continue processing
      // the data contained with this segment.
      state.dispatch(data.output.push, decryptedData);

      // Once we've written all chunks to the output, we also need
      // to close it to let the processor know, that we've
      // processed all the data there is.
      state.dispatch(data.output.close);
    },
  );

  return {
    name: 'my-custom-segment-decryptor',
    type: SegmentProcessorType.Decryptor,

    // The player currently does not extract the encryption format
    // from the manifest, and it uses a hard-coded value
    // internally instead. This will change in the future, but for
    // now every segment decryptor must specify this hard-coded
    // encryption format as it will not be executed otherwise.
    supportedEncryptionFormats: ['😽'],
    process: decryptorProcessor,
  } as SegmentDecryptor;
}
