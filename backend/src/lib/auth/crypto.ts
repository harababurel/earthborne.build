import {
  type BinaryLike,
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify<BinaryLike, BinaryLike, number, Buffer>(scrypt);

export const DUMMY_PASSWORD_HASH =
  "00000000000000000000000000000000:abfdd81bf7129c0eb2d1a12469d84d24639044a94ce15e6b8fa230aaed3949eaca1910f40f5f90e40ce744bd47bcfd7ef54b3cc73cb2c6a91138b11e84b2d69c";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  const parts = hash.split(":");

  if (parts.length !== 2) {
    return false;
  }

  const salt = parts[0];
  const key = parts[1];

  if (!salt || !key) {
    return false;
  }

  const derivedKey = await scryptAsync(password, salt, 64);
  const storedKey = Buffer.from(key, "hex");

  if (storedKey.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedKey, derivedKey);
}

export function generateRandomToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
