# WATP TypeScript SDK

Scaffold minimo utilizavel para o contrato real atual do WATP.

Este pacote cobre apenas a superficie congelada em `2026-04-22`:

- tipos do envelope real
- helper de hash SHA-256
- builders para `HASH_INTEREST`, `HASH_COUNTER`, `HASH_CONCLUDED` e `HASH_CANCELLED`

## Escopo

O SDK segue o contrato real atual do projeto:

- `negotiation_id` e obrigatorio para mensagens encadeadas
- `previousHash` entra no hash canonico
- o hash usa `SHA-256` sobre este JSON:

```json
{
  "type": "HASH_INTEREST",
  "payload": {
    "sku": "ABC-1",
    "qty": 10,
    "unit_price": 12.5
  },
  "previousHash": null,
  "timestamp": "2026-04-22T00:00:00.000Z"
}
```

Observacao: o runtime atual aceita qualquer string de timestamp nao vazia. O SDK usa `new Date().toISOString()` por padrao.

## Instalar dependencias locais

```bash
npm install
```

## Validar

```bash
npm run check
```

## Build

```bash
npm run build
```

## Exemplo rapido

```ts
import {
  buildHashConcludedMessage,
  buildHashInterestMessage,
} from "@watp/sdk-typescript";

const interest = await buildHashInterestMessage({
  sender: "site-b",
  payload: {
    sku: "TC-PC6-150",
    qty: 100,
    unit_price: 11.9,
    currency: "BRL",
    buyer: "site-b",
    buyer_url: "https://buyer.example.com"
  }
});

const concluded = await buildHashConcludedMessage({
  negotiationId: "neg-123",
  previousHash: interest.hash,
  sender: "watp-produtos",
  payload: {
    sku: "TC-PC6-150",
    qty: 100,
    unit_price: 11.9,
    currency: "BRL",
    accepted_by: "supplier_agent",
    payment_url: "https://supplier.example.com/checkout/order-pay/123/?pay_for_order=true&key=wc_order_abc"
  }
});
```

## API

### Tipos

- `WATPMessageType`
- `WATPMessageEnvelope`
- `WATPInterestPayload`
- `WATPCounterPayload`
- `WATPConcludedPayload`
- `WATPCancelledPayload`

### Helpers

- `createCanonicalMessageBody()`
- `sha256Hex()`
- `computeMessageHash()`

### Builders

- `buildHashInterestMessage()`
- `buildHashCounterMessage()`
- `buildHashConcludedMessage()`
- `buildHashCancelledMessage()`

## Limites deliberados

Este scaffold nao inclui ainda:

- cliente HTTP
- autenticacao Bearer/HMAC
- verificacao de `signature`
- SDK de registry/discovery
- testes de conformidade
