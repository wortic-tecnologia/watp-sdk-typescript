export type WATPMessageType =
  | "HASH_INTEREST"
  | "HASH_PROPOSAL"
  | "HASH_COUNTER"
  | "HASH_CONCLUDED"
  | "HASH_CANCELLED"
  | "HASH_WAITING_HUMAN";

export type WATPBuilderMessageType =
  | "HASH_INTEREST"
  | "HASH_COUNTER"
  | "HASH_CONCLUDED"
  | "HASH_CANCELLED";

export interface WATPBillingPayload {
  company_name?: string;
  email?: string;
  phone?: string;
  address_1?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  document?: string;
  [key: string]: unknown;
}

export interface WATPBaseNegotiationPayload {
  item?: string;
  sku?: string;
  product_name?: string;
  qty?: number;
  quantity?: number;
  unit_price?: number;
  price?: number;
  currency?: string;
  buyer?: string;
  buyer_name?: string;
  buyer_url?: string;
  billing?: WATPBillingPayload;
  reason?: string;
  accepted_by?: string;
  approved_by?: string;
  counter_by?: string;
  agent?: string;
  message?: string;
  payment_url?: string;
  [key: string]: unknown;
}

export interface WATPInterestPayload extends WATPBaseNegotiationPayload {}

export interface WATPCounterPayload extends WATPBaseNegotiationPayload {}

export interface WATPConcludedPayload extends WATPBaseNegotiationPayload {}

export interface WATPCancelledPayload {
  reason?: string;
  message?: string;
  [key: string]: unknown;
}

export type WATPPayload =
  | WATPInterestPayload
  | WATPCounterPayload
  | WATPConcludedPayload
  | WATPCancelledPayload;

export interface WATPMessageEnvelope<
  TType extends WATPMessageType = WATPMessageType,
  TPayload extends WATPPayload = WATPPayload,
> {
  id: string;
  negotiation_id?: string;
  type: TType;
  payload: TPayload;
  hash: string;
  previousHash?: string | null;
  prev_hash?: string | null;
  timestamp: string;
  sender: string;
  signature?: string | null;
}

export interface WATPCanonicalHashInput<TPayload extends Record<string, unknown>> {
  type: WATPMessageType;
  payload: TPayload;
  previousHash?: string | null;
  timestamp: string;
}

export interface WATPBuilderBaseInput<TPayload extends Record<string, unknown>> {
  id?: string;
  timestamp?: string;
  sender: string;
  signature?: string | null;
  payload: TPayload;
}

export interface BuildHashInterestMessageInput
  extends WATPBuilderBaseInput<WATPInterestPayload> {
  negotiationId?: string;
  previousHash?: string | null;
}

export interface BuildChainedMessageInput<TPayload extends Record<string, unknown>>
  extends WATPBuilderBaseInput<TPayload> {
  negotiationId: string;
  previousHash: string;
}

export type BuildHashCounterMessageInput =
  BuildChainedMessageInput<WATPCounterPayload>;

export type BuildHashConcludedMessageInput =
  BuildChainedMessageInput<WATPConcludedPayload>;

export type BuildHashCancelledMessageInput =
  BuildChainedMessageInput<WATPCancelledPayload>;
