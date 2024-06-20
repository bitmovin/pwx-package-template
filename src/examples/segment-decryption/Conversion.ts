import type { EncryptionDataBackendResponse } from './Types';

function base64ToArrayBuffer(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

export function backendResponseToEncryptionData(response: EncryptionDataBackendResponse) {
  return {
    key: base64ToArrayBuffer(response.keyBase64),
    iv: base64ToArrayBuffer(response.ivBase64),
  };
}
