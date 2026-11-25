import { prisma } from "./db";
import bcrypt from "bcryptjs";
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "pricerizz_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET is missing or too short");
  }

  return secret;
}

function signPayload(payload: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

export function createSessionToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
    })
  ).toString("base64url");

  return `${payload}.${signPayload(payload)}`;
}

export function verifySessionToken(
  token: string | undefined | null
): string | null {
  if (!token || token.length > 4096) return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payload, signature] = parts;

    const expected = Buffer.from(signPayload(payload), "utf8");
    const supplied = Buffer.from(signature, "utf8");

    if (expected.length !== supplied.length) return null;
    if (!timingSafeEqual(expected, supplied)) return null;

    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    if (typeof data.userId !== "string" || !data.userId) {
      return null;
    }

    if (
      !Number.isSafeInteger(data.exp) ||
      data.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return data.userId;
  } catch {
    return null;
  }
}

export async function registerUser(email: string, password: string) {
  const hashed = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: { email, password: hashed },
  });
}

export async function verifyUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) return null;

  const ok = await bcrypt.compare(password, user.password);

  if (!ok) return null;

  return user;
}
