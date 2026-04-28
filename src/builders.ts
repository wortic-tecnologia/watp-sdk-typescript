import {
  computeMessageHash,
  isHexSha256,
} from "./hash.js";
import type {
  BuildHashCancelledMessageInput,
  BuildHashConcludedMessageInput,
  BuildHashCounterMessageInput,
  BuildHashInterestMessageInput,
  WATPBuilderMessageType,
  WATPCancelledPayload,
  WATPConcludedPayload,
  WATPCounterPayload,
  WATPInterestPayload,
  WATPMessageEnvelope,
} from "./types.js";

export class WATPBuilderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WATPBuilderError";
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getPayloadQuantity(payload: Record<string, unknown>): number | undefined {
  const value = payload.qty ?? payload.quantity;
  return typeof value === "number" ? value : undefined;
}

function getPayloadUnitPrice(payload: Record<string, unknown>): number | undefined {
  const value = payload.unit_price ?? payload.price;
  return typeof value === "number" ? value : undefined;
}

function assertNegotiationPayload(payload: Record<string, unknown>): void {
  if (
    !isNonEmptyString(payload.sku) &&
    !isNonEmptyString(payload.item) &&
    !isNonEmptyString(payload.product_name)
  ) {
    throw new WATPBuilderError(
      "payload must include at least one of sku, item, or product_name",
    );
  }

  const qty = getPayloadQuantity(payload);
  if (typeof qty !== "number" || !Number.isFinite(qty) || qty <= 0) {
    throw new WATPBuilderError("payload qty/quantity must be a finite number greater than zero");
  }

  const unitPrice = getPayloadUnitPrice(payload);
  if (typeof unitPrice !== "number" || !Number.isFinite(unitPrice) || unitPrice < 0) {
    throw new WATPBuilderError(
      "payload unit_price/price must be a finite number greater than or equal to zero",
    );
  }
}

function assertNegotiationId(value: string): void {
  if (!isNonEmptyString(value)) {
    throw new WATPBuilderError("negotiationId is required for chained messages");
  }
}

function assertPreviousHash(value: string): void {
  if (!isHexSha256(value)) {
    throw new WATPBuilderError("previousHash must be a lowercase SHA-256 hex string");
  }
}

function assertSender(value: string | undefined): string {
  if (!isNonEmptyString(value)) {
    throw new WATPBuilderError("sender is required");
  }

  return value;
}

function createTimestamp(value?: string): string {
  if (value !== undefined) {
    if (!isNonEmptyString(value)) {
      throw new WATPBuilderError("timestamp must be a non-empty string");
    }
    return value;
  }

  return new Date().toISOString();
}

async function createMessageId(explicitId?: string): Promise<string> {
  if (explicitId !== undefined) {
    if (!isNonEmptyString(explicitId)) {
      throw new WATPBuilderError("id must be a non-empty string");
    }
    return explicitId;
  }

  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const { randomUUID } = await import("node:crypto");
  return randomUUID();
}

async function buildMessage<TType extends WATPBuilderMessageType, TPayload extends Record<string, unknown>>(
  args: {
    type: TType;
    payload: TPayload;
    negotiationId?: string | undefined;
    previousHash?: string | null | undefined;
    timestamp?: string | undefined;
    sender?: string | undefined;
    signature?: string | null | undefined;
    id?: string | undefined;
  },
): Promise<WATPMessageEnvelope<TType, TPayload>> {
  const timestamp = createTimestamp(args.timestamp);
  const previousHash = args.previousHash ?? null;
  const id = await createMessageId(args.id);
  const sender = assertSender(args.sender);

  const payload = { ...args.payload };
  if (args.type !== "HASH_CANCELLED") {
    assertNegotiationPayload(payload);
  }

  if (args.type !== "HASH_INTEREST") {
    assertNegotiationId(args.negotiationId ?? "");
    assertPreviousHash(previousHash ?? "");
  } else if (previousHash !== null) {
    assertPreviousHash(previousHash);
  }

  const hash = await computeMessageHash({
    type: args.type,
    payload,
    previousHash,
    timestamp,
  });

  return {
    id,
    ...(args.negotiationId ? { negotiation_id: args.negotiationId } : {}),
    type: args.type,
    payload,
    hash,
    previousHash,
    timestamp,
    sender,
    ...(args.signature !== undefined ? { signature: args.signature } : {}),
  };
}

export async function buildHashInterestMessage(
  input: BuildHashInterestMessageInput,
): Promise<WATPMessageEnvelope<"HASH_INTEREST", WATPInterestPayload>> {
  return buildMessage({
    type: "HASH_INTEREST",
    payload: input.payload,
    negotiationId: input.negotiationId,
    previousHash: input.previousHash ?? null,
    timestamp: input.timestamp,
    sender: input.sender,
    signature: input.signature,
    id: input.id,
  });
}

export async function buildHashCounterMessage(
  input: BuildHashCounterMessageInput,
): Promise<WATPMessageEnvelope<"HASH_COUNTER", WATPCounterPayload>> {
  return buildMessage({
    type: "HASH_COUNTER",
    payload: input.payload,
    negotiationId: input.negotiationId,
    previousHash: input.previousHash,
    timestamp: input.timestamp,
    sender: input.sender,
    signature: input.signature,
    id: input.id,
  });
}

export async function buildHashConcludedMessage(
  input: BuildHashConcludedMessageInput,
): Promise<WATPMessageEnvelope<"HASH_CONCLUDED", WATPConcludedPayload>> {
  return buildMessage({
    type: "HASH_CONCLUDED",
    payload: input.payload,
    negotiationId: input.negotiationId,
    previousHash: input.previousHash,
    timestamp: input.timestamp,
    sender: input.sender,
    signature: input.signature,
    id: input.id,
  });
}

export async function buildHashCancelledMessage(
  input: BuildHashCancelledMessageInput,
): Promise<WATPMessageEnvelope<"HASH_CANCELLED", WATPCancelledPayload>> {
  return buildMessage({
    type: "HASH_CANCELLED",
    payload: input.payload,
    negotiationId: input.negotiationId,
    previousHash: input.previousHash,
    timestamp: input.timestamp,
    sender: input.sender,
    signature: input.signature,
    id: input.id,
  });
}
