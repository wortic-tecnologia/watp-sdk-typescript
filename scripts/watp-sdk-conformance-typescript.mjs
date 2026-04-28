#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixturesDir = path.join(root, "protocol", "fixtures");
const sdkEntryCandidates = [
  path.join(root, "sdk", "typescript", "dist", "index.js"),
  path.join(root, "dist", "index.js"),
];
const sdkEntry = sdkEntryCandidates.find((candidate) => fs.existsSync(candidate));
if (!sdkEntry) {
  console.error(`FAIL TypeScript SDK dist entry not found. Tried: ${sdkEntryCandidates.join(", ")}`);
  process.exit(1);
}
const { buildNodeSignature, computeMessageHash, validateMessageEnvelope, verifyNodeSignature } = await import(sdkEntry);
const expected = new Map([
  ["valid-hash-interest.json", true],
  ["valid-hash-concluded-payment-url.json", true],
  ["invalid-hash-interest-missing-buyer-url.json", false],
  ["invalid-hash-counter-missing-negotiation-id.json", false],
  ["invalid-hash-concluded-invalid-payment-url.json", false],
]);

let failures = 0;
for (const [fileName, shouldPass] of expected) {
  const fixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, fileName), "utf8"));
  const error = await validateMessageEnvelope(fixture);

  if (shouldPass && error !== null) {
    failures += 1;
    console.error(`FAIL ${fileName}: expected valid, got ${error}`);
    continue;
  }

  if (!shouldPass && error === null) {
    failures += 1;
    console.error(`FAIL ${fileName}: expected invalid, got valid`);
    continue;
  }

  console.log(`OK ${fileName}`);
}

if (failures > 0) {
  process.exit(1);
}

const expectedSignature = "sha256=e94d4c3acf8e7f838218bb8aa3ab6e98f6a78b0755421a81efd1d96497e19411";
const signature = buildNodeSignature("{}", "secret-a");
if (signature !== expectedSignature || !verifyNodeSignature("{}", signature, "secret-a") || verifyNodeSignature("{}", signature, "wrong-secret")) {
  console.error("FAIL shared HMAC signature vector");
  process.exit(1);
}

const wholeNumberHash = await computeMessageHash({
  type: "HASH_INTEREST",
  payload: { sku: "SKU-100", qty: 1, unit_price: 100.0, currency: "BRL" },
  previousHash: null,
  timestamp: "2026-04-28T00:00:00.000000Z",
});
if (wholeNumberHash !== "351a76ec467a22fcdde02586af196e866f0fd07e3609b3b145be568b4e02d56a") {
  console.error("FAIL PHP-compatible whole-number float hash vector");
  process.exit(1);
}

console.log("TypeScript SDK conformance: OK");