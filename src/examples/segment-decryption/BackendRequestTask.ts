import { createTask } from '@bitmovin/player-web-x/playerx-framework-utils';
import type { HttpRequestMethod, HttpResponseType } from '@bitmovin/player-web-x/types/packages/network/Types';

import { backendResponseToEncryptionData } from './Conversion';
import type { EncryptionDataAtom } from './EncryptionDataAtom';
import type { EncryptionDataBackendResponse, SegmentDecryptorPackageContext } from './Types';

function getRequestConfig() {
  const endpoint =
    'data:application/json;charset=utf-8;base64,ew0KICAiaXZCYXNlNjQiOiAiZEdoaGJtc2dlVzkxSUdadmNpQjFjdz09IiwNCiAgImtleUJhc2U2NCI6ICJhVzVuSUhCc1lYbGxjaUIzWldJZ2VBPT0iDQp9';

  return {
    url: endpoint,
    method: 'GET' as HttpRequestMethod.GET,
    responseType: 'json' as HttpResponseType.JSON,
  };
}

async function fetchEncryptionData(context: SegmentDecryptorPackageContext) {
  const networkTask = context.registry.get('network-task');
  const requestConfig = getRequestConfig();

  // Wait for a bit to simulate a slow backend request
  // and allow for segment downloads to start in the
  // background before the encryption data is available
  await context.effects.timeout(context.abortSignal, 2000);

  const response = await context.fork(networkTask, [requestConfig, undefined]);

  return backendResponseToEncryptionData(response.body as EncryptionDataBackendResponse);
}

// A task that requests some decryption information,
// which is needed to decrypt segments, from a backend
// and then updates the `EncryptionDataAtom` with the
// returned data.
export const BackendRequestTask = createTask(
  'backend-request-package',
  async (encryptionDataAtom: EncryptionDataAtom, context: SegmentDecryptorPackageContext) => {
    const { state } = context.effects;
    const logger = context.registry.get('logger');
    const { red, bold } = context.registry.get('utils').AnsiEscapeSequences;
    const logPrefix = `[${bold(red('Backend'))}] `;

    logger.log(logPrefix + `Requesting encryption data...`);

    const encryptionData = await fetchEncryptionData(context);

    logger.log(logPrefix + `Encryption data received:`, encryptionData);

    state.dispatch(encryptionDataAtom.setValue, encryptionData);
  },
);
