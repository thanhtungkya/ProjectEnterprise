const ALGO_VERSION = "v2";
const LEGACY_ALGO_VERSION = "v1";
const FALLBACK_ALGO_VERSION = "v0";
const LEGACY_SHARED_SEED = "secure-enterprise-web-foundation";
const IV_LENGTH = 12;
const ITERATIONS = 120_000;
const ROTATION_WINDOW_MS = 12 * 60 * 60 * 1000;
const DEVICE_SECRET_KEY = "messenger_device_secret_v2";
const RUNTIME_SEED = "secure-enterprise-runtime-seed";
let inMemoryDeviceSecret: string | null = null;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getWebCrypto(): Crypto | null {
  const c = (globalThis as any)?.crypto as Crypto | undefined;
  if (!c || typeof c.getRandomValues !== "function") return null;
  return c;
}

function hasSubtleCrypto(): boolean {
  const c = getWebCrypto();
  return Boolean(c && (c as any).subtle);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

const keyCache = new Map<string, CryptoKey>();

function getSession(): { token?: string; user?: { id?: string } } | null {
  try {
    const raw = localStorage.getItem("messenger_session");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : null;
  } catch {
    return null;
  }
}

function getStorage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

function ensureDeviceSecret(): string {
  if (inMemoryDeviceSecret) return inMemoryDeviceSecret;

  const storage = getStorage();
  if (storage) {
    try {
      const existing = storage.getItem(DEVICE_SECRET_KEY);
      if (existing) {
        inMemoryDeviceSecret = existing;
        return existing;
      }
    } catch {
      // Fallback to in-memory secret below.
    }
  }

  const c = getWebCrypto();
  const seed = new Uint8Array(32);
  if (c) {
    c.getRandomValues(seed);
  } else {
    for (let i = 0; i < seed.length; i += 1) {
      seed[i] = Math.floor(Math.random() * 256);
    }
  }
  const generated = bytesToBase64(seed);
  inMemoryDeviceSecret = generated;

  if (storage) {
    try {
      storage.setItem(DEVICE_SECRET_KEY, generated);
    } catch {
      // Ignore quota/storage policy errors and keep in-memory secret for session.
    }
  }

  return generated;
}

function getUserFingerprint(): string {
  const session = getSession();
  const uid = session?.user?.id || "anonymous";
  const tokenTail = (session?.token || "no-token").slice(-24);
  const deviceSecret = ensureDeviceSecret();
  return `${uid}|${tokenTail}|${deviceSecret}|${RUNTIME_SEED}`;
}

function getChannelEpoch(now = Date.now()): number {
  return Math.floor(now / ROTATION_WINDOW_MS);
}

async function deriveChannelKey(
  channelId: string,
  epoch: number,
): Promise<CryptoKey> {
  const c = getWebCrypto();
  if (!c?.subtle) {
    throw new Error("WebCrypto subtle API unavailable");
  }

  const cacheId = `${channelId}:${epoch}:${getUserFingerprint().slice(0, 18)}`;
  const cached = keyCache.get(cacheId);
  if (cached) return cached;

  const baseKey = await c.subtle.importKey(
    "raw",
    encoder.encode(getUserFingerprint()),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  const key = await c.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(`chat:${channelId}:epoch:${epoch}`),
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"],
  );

  keyCache.set(cacheId, key);
  return key;
}

async function deriveLegacyV1Key(channelId: string): Promise<CryptoKey> {
  const c = getWebCrypto();
  if (!c?.subtle) {
    throw new Error("WebCrypto subtle API unavailable");
  }

  const cacheId = `legacy-v1:${channelId}`;
  const cached = keyCache.get(cacheId);
  if (cached) return cached;

  const baseKey = await c.subtle.importKey(
    "raw",
    encoder.encode(LEGACY_SHARED_SEED),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  const key = await c.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(`chat:${channelId}`),
      iterations: 100_000,
      hash: "SHA-256",
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"],
  );

  keyCache.set(cacheId, key);
  return key;
}

function parseV2Payload(payload: string): {
  epoch: number;
  iv: Uint8Array;
  ciphertext: Uint8Array;
} | null {
  const parts = payload.split(":");
  if (parts.length !== 4) return null;
  if (parts[0] !== ALGO_VERSION) return null;

  const epoch = Number(parts[1]);
  if (!Number.isFinite(epoch)) return null;

  try {
    return {
      epoch,
      iv: base64ToBytes(parts[2]),
      ciphertext: base64ToBytes(parts[3]),
    };
  } catch {
    return null;
  }
}

export const CryptoService = {
  clearKeyCache(): void {
    keyCache.clear();
  },

  currentEpoch(): number {
    return getChannelEpoch();
  },

  prewarmChannelKey(channelId: string): Promise<void> {
    const epoch = getChannelEpoch();
    return deriveChannelKey(channelId, epoch).then(() => undefined);
  },

  async encryptForChannel(
    channelId: string,
    plaintext: string,
  ): Promise<string> {
    const c = getWebCrypto();
    if (!c?.subtle || !hasSubtleCrypto()) {
      return `${FALLBACK_ALGO_VERSION}:${bytesToBase64(encoder.encode(plaintext))}`;
    }

    const epoch = getChannelEpoch();
    const key = await deriveChannelKey(channelId, epoch);
    const iv = c.getRandomValues(new Uint8Array(IV_LENGTH));
    const encrypted = await c.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoder.encode(plaintext),
    );

    return [
      ALGO_VERSION,
      String(epoch),
      bytesToBase64(iv),
      bytesToBase64(new Uint8Array(encrypted)),
    ].join(":");
  },

  async decryptForChannel(
    channelId: string,
    cipherPayload: string,
  ): Promise<string> {
    if (!cipherPayload) return "";

    if (cipherPayload.startsWith(`${FALLBACK_ALGO_VERSION}:`)) {
      const raw = cipherPayload.slice(FALLBACK_ALGO_VERSION.length + 1);
      return decoder.decode(base64ToBytes(raw));
    }

    const c = getWebCrypto();
    if (!c?.subtle || !hasSubtleCrypto()) {
      return cipherPayload;
    }

    const parsedV2 = parseV2Payload(cipherPayload);
    if (parsedV2) {
      const key = await deriveChannelKey(channelId, parsedV2.epoch);
      const decrypted = await c.subtle.decrypt(
        { name: "AES-GCM", iv: parsedV2.iv },
        key,
        parsedV2.ciphertext,
      );

      return decoder.decode(decrypted);
    }

    // Backward compatibility: decode v1 payload if present.
    if (cipherPayload.startsWith(`${LEGACY_ALGO_VERSION}:`)) {
      const encoded = cipherPayload.slice(LEGACY_ALGO_VERSION.length + 1);
      const combined = base64ToBytes(encoded);
      const iv = combined.slice(0, IV_LENGTH);
      const data = combined.slice(IV_LENGTH);

      const key = await deriveLegacyV1Key(channelId);
      const decrypted = await c.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        data,
      );
      return decoder.decode(decrypted);
    }

    // Legacy plaintext fallback.
    return cipherPayload;
  },

  // Roadmap-level interface for future PQC/hybrid key exchange integration.
  async generateClientKeyBundle(): Promise<{
    scheme: "hybrid-ready";
    publicBundle: string;
    createdAt: number;
  }> {
    const c = getWebCrypto();
    const nonce = new Uint8Array(24);
    if (c) {
      c.getRandomValues(nonce);
    } else {
      for (let i = 0; i < nonce.length; i += 1) {
        nonce[i] = Math.floor(Math.random() * 256);
      }
    }
    return {
      scheme: "hybrid-ready",
      publicBundle: bytesToBase64(nonce),
      createdAt: Date.now(),
    };
  },

  async deriveSharedSecretFromPeer(_peerBundle: string): Promise<string> {
    const c = getWebCrypto();
    if (!c?.subtle) {
      return bytesToBase64(encoder.encode(`${Date.now()}`));
    }

    const material = `${getUserFingerprint()}|${Date.now()}`;
    const digest = await c.subtle.digest("SHA-256", encoder.encode(material));
    return bytesToBase64(new Uint8Array(digest));
  },
};
