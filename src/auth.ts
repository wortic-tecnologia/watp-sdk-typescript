import { createHmac, timingSafeEqual } from "node:crypto";

export function buildNodeSignature(rawBody: string, secret: string): string {
  if (secret.trim() === "") {
    throw new Error("secret is required");
  }

  return `sha256=${createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")}`;
}

export function verifyNodeSignature(rawBody: string, signature: string, secret: string): boolean {
  if (signature.trim() === "" || secret.trim() === "") {
    return false;
  }

  const expected = Buffer.from(buildNodeSignature(rawBody, secret), "utf8");
  const provided = Buffer.from(signature, "utf8");
  if (expected.length !== provided.length) {
    return false;
  }

  return timingSafeEqual(expected, provided);
}