import type {
  WATPCanonicalHashInput,
  WATPMessageType,
} from "./types.js";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getCrypto(): Promise<Crypto> {
  if (globalThis.crypto?.subtle) {
    return globalThis.crypto;
  }

  const { webcrypto } = await import("node:crypto");
  return webcrypto as Crypto;
}

export async function sha256Hex(value: string): Promise<string> {
  const crypto = await getCrypto();
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return toHex(new Uint8Array(digest));
}

export function createCanonicalMessageBody<TPayload extends Record<string, unknown>>(
  input: WATPCanonicalHashInput<TPayload>,
): string {
  return JSON.stringify({
    type: input.type,
    payload: input.payload,
    previousHash: input.previousHash ?? null,
    timestamp: input.timestamp,
  });
}

export async function computeMessageHash<TPayload extends Record<string, unknown>>(
  input: WATPCanonicalHashInput<TPayload>,
): Promise<string> {
  return sha256Hex(createCanonicalMessageBody(input));
}

export function isHexSha256(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

export function isBuilderSupportedType(
  value: string,
): value is Extract<
  WATPMessageType,
  "HASH_INTEREST" | "HASH_COUNTER" | "HASH_CONCLUDED" | "HASH_CANCELLED"
> {
  return (
    value === "HASH_INTEREST" ||
    value === "HASH_COUNTER" ||
    value === "HASH_CONCLUDED" ||
    value === "HASH_CANCELLED"
  );
}
