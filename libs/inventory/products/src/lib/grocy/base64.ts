// Node 26 has `Uint8Array#toBase64`. The base TypeScript lib of the workspace
// is ES2022 and does not declare it, so this file declares the one method
// that the Grocy file API client needs. The declaration goes when the base
// lib moves to a version that holds it.
declare global {
  interface Uint8Array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike> {
    toBase64(this: Uint8Array<TArrayBuffer>): string;
  }
}

const encoder = new TextEncoder();

// This function encodes a text as BASE64. The Grocy file API wants the file
// name BASE64 encoded in the path.
export function toBase64(text: string): string {
  return encoder.encode(text).toBase64();
}
