import {
  computeMessageHash,
  isHexSha256,
} from "./hash.js";
import type {
  WATPMessageEnvelope,
  WATPMessageType,
} from "./types.js";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isSupportedType(value: string): value is WATPMessageType {
  return (
    value === "HASH_INTEREST" ||
    value === "HASH_PROPOSAL" ||
    value === "HASH_COUNTER" ||
    value === "HASH_CONCLUDED" ||
    value === "HASH_CANCELLED" ||
    value === "HASH_WAITING_HUMAN"
  );
}

function hasPrivateIpv4(host: string): boolean {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return false;
  }

  const parts = host.split(".").map(Number);
  const first = parts[0] ?? 0;
  const second = parts[1] ?? 0;

  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254)
  );
}

function isPublicHttpsUrl(value: unknown, options: { allowQuery: boolean }): boolean {
  if (!isNonEmptyString(value)) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  const host = parsed.hostname.toLowerCase();
  if (parsed.protocol !== "https:" || host === "") {
    return false;
  }

  if (parsed.username || parsed.password || parsed.hash) {
    return false;
  }

  if (!options.allowQuery && parsed.search) {
    return false;
  }

  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    return false;
  }

  return !hasPrivateIpv4(host);
}

function payloadHasIdentity(payload: Record<string, unknown>): boolean {
  return [payload.sku, payload.item, payload.product_name].some(isNonEmptyString);
}

function payloadNumber(payload: Record<string, unknown>, canonicalKey: string, aliasKey: string): number | undefined {
  const value = payload[canonicalKey] ?? payload[aliasKey];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export async function validateMessageEnvelope(value: unknown): Promise<string | null> {
  if (!isObject(value)) {
    return "WATP envelope must be an object";
  }

  if (!isNonEmptyString(value.id)) {
    return "id is required";
  }

  if (!isNonEmptyString(value.sender)) {
    return "sender is required";
  }

  if (!isNonEmptyString(value.type) || !isSupportedType(value.type)) {
    return "Invalid message type";
  }

  if (!isObject(value.payload)) {
    return "payload must be an object";
  }

  if (!isNonEmptyString(value.hash) || !isHexSha256(value.hash)) {
    return "hash must be a lowercase SHA-256 hex string";
  }

  if (!isNonEmptyString(value.timestamp)) {
    return "timestamp is required";
  }

  const previousHash = value.previousHash ?? value.prev_hash ?? null;
  if (previousHash !== null && (!isNonEmptyString(previousHash) || !isHexSha256(previousHash))) {
    return "previousHash must be a lowercase SHA-256 hex string";
  }

  if (value.type !== "HASH_INTEREST" && !isNonEmptyString(value.negotiation_id)) {
    return `${value.type} requires negotiation_id`;
  }

  if (value.type !== "HASH_INTEREST" && previousHash === null) {
    return `${value.type} requires previousHash`;
  }

  if (value.type !== "HASH_CANCELLED") {
    if (!payloadHasIdentity(value.payload)) {
      return "payload must include at least one of sku, item, or product_name";
    }

    const qty = payloadNumber(value.payload, "qty", "quantity");
    if (qty === undefined || qty <= 0) {
      return "payload must include qty or quantity greater than zero";
    }

    const unitPrice = payloadNumber(value.payload, "unit_price", "price");
    if (unitPrice === undefined || unitPrice < 0) {
      return "payload must include unit_price or price greater than or equal to zero";
    }
  }

  if (value.type === "HASH_INTEREST" && !isPublicHttpsUrl(value.payload.buyer_url, { allowQuery: false })) {
    return "buyer_url is required for HASH_INTEREST and must be a public HTTPS URL";
  }

  if (value.payload.payment_url !== undefined && value.payload.payment_url !== "" && !isPublicHttpsUrl(value.payload.payment_url, { allowQuery: true })) {
    return "payment_url must be a public HTTPS URL";
  }

  const expectedHash = await computeMessageHash({
    type: value.type,
    payload: value.payload,
    previousHash: previousHash as string | null,
    timestamp: value.timestamp,
  });
  if (expectedHash !== value.hash) {
    return "Invalid hash";
  }

  return null;
}

export async function assertValidMessageEnvelope<TEnvelope extends WATPMessageEnvelope>(value: TEnvelope): Promise<TEnvelope> {
  const error = await validateMessageEnvelope(value);
  if (error !== null) {
    throw new Error(error);
  }

  return value;
}