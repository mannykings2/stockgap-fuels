/** Password hashing, session tokens and other security primitives. */
import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

const SCRYPT_KEY_LENGTH = 64;

export function randomId(): string {
  return randomUUID();
}

/** `scrypt:<salt>:<hash>` - self-describing so the parameters can evolve. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Deterministic label for display only (reset tokens are stored hashed).
 * Reset tokens are surfaced in development so the demo can be walked through.
 */
export function maskToken(token: string): string {
  return `${token.slice(0, 6)}...`;
}
