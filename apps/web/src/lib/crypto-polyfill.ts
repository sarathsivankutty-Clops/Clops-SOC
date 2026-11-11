/**
 * Web Crypto API Polyfill for Non-HTTPS Contexts (HTTP / Internal IP / EC2)
 *
 * In non-secure contexts (e.g. plain HTTP on an internal IP or AWS EC2 instance
 * prior to ALB TLS termination), browsers restrict `window.crypto.randomUUID`
 * and `window.crypto.subtle`. This module provides an SSR-safe RFC4122 v4 UUID
 * generator and a pure-JS SHA-256 digest when native Web Crypto is unavailable.
 */

export function sha256(bytes: Uint8Array): Uint8Array {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i = 0;
  let j = 0;

  const result: number[] = [];
  const words: number[] = [];
  const asciiBitLength = bytes.length * 8;

  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, number> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 300; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  for (i = 0; i < bytes.length; i++) {
    words[i >> 2] |= bytes[i] << ((3 - (i % 4)) * 8);
  }

  words[asciiBitLength >> 5] |= 0x80 << ((3 - ((asciiBitLength >> 3) % 4)) * 8);
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  for (j = 0; j < words.length; j += 16) {
    const w = words.slice(j, j + 16);
    const oldHash = hash.slice(0);

    for (i = 0; i < 64; i++) {
      if (i >= 16) {
        const w15 = w[i - 15];
        const w2 = w[i - 2];
        const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
        const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
        w[i] = (((w[i - 16] + s0) | 0) + ((w[i - 7] + s1) | 0)) | 0;
      }

      const s1 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = ((((hash[7] + s1) | 0) + ((ch + k[i]) | 0)) | 0 + w[i]) | 0;
      const s0 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s0 + maj) | 0;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      result.push((hash[i] >> (8 * j)) & 255);
    }
  }

  return new Uint8Array(result);
}

export function polyfillRandomUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

if (typeof window !== 'undefined') {
  const g = window as unknown as Record<string, any>;
  if (!g.crypto) {
    g.crypto = {};
  }

  if (!g.crypto.randomUUID) {
    g.crypto.randomUUID = polyfillRandomUUID;
  }

  if (!g.crypto.getRandomValues) {
    g.crypto.getRandomValues = function <T extends ArrayBufferView | null>(array: T): T {
      if (!array) return array;
      const view = new Uint8Array((array as any).buffer, (array as any).byteOffset, (array as any).byteLength);
      for (let i = 0; i < view.length; i++) {
        view[i] = Math.floor(Math.random() * 256);
      }
      return array;
    };
  }

  if (!g.crypto.subtle) {
    g.crypto.subtle = {
      digest: async (algorithm: string | { name: string }, data: ArrayBuffer | ArrayBufferView): Promise<ArrayBuffer> => {
        const algoName = typeof algorithm === 'string' ? algorithm : algorithm.name;
        if (algoName.toUpperCase() === 'SHA-256') {
          let uint8: Uint8Array;
          if (data instanceof Uint8Array) {
            uint8 = data;
          } else if (ArrayBuffer.isView(data)) {
            uint8 = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
          } else {
            uint8 = new Uint8Array(data);
          }
          const hashBytes = sha256(uint8);
          return hashBytes.buffer as ArrayBuffer;
        }
        throw new Error(`Unsupported algorithm: ${algoName}`);
      },
    };
  }
}
