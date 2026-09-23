import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "malaya_studio_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

// Emergency development switch. Keep false/undefined in production.
export const STUDIO_AUTH_DISABLED = process.env.STUDIO_AUTH_DISABLED === "true";

function secret(): string {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be configured and at least 32 characters long");
  }
  return value;
}

function password(): string {
  return process.env.ADMIN_PASSWORD?.trim() || "";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sessionToken(expiresAt: number): string {
  const payload = String(expiresAt);
  return payload + "." + sign(payload);
}

function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const [expiresAtRaw, signature] = token.split(".");
  if (!expiresAtRaw || !signature || !/^\d+$/.test(expiresAtRaw)) return false;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;
  return safeEqual(signature, sign(expiresAtRaw));
}

export async function isAdminAuthenticated(): Promise<boolean> {
  if (STUDIO_AUTH_DISABLED) return true;
  try {
    const store = await cookies();
    return verifyToken(store.get(COOKIE_NAME)?.value);
  } catch {
    return false;
  }
}

export async function requireAdminApi(): Promise<{ ok: true } | { ok: false; response: Response }> {
  try {
    if (STUDIO_AUTH_DISABLED) return { ok: true };
    if (!process.env.ADMIN_SESSION_SECRET) {
      return {
        ok: false,
        response: Response.json(
          { ok: false, message: "Studio auth is not configured" },
          { status: 503 },
        ),
      };
    }
    if (!(await isAdminAuthenticated())) {
      return {
        ok: false,
        response: Response.json({ ok: false, message: "Unauthorized" }, { status: 401 }),
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      response: Response.json({ ok: false, message: "Studio auth is not configured" }, { status: 503 }),
    };
  }
}

export async function loginAdmin(candidate: string): Promise<boolean> {
  try {
    const configured = password();
    if (!configured) return false;
    return safeEqual(candidate, configured);
  } catch {
    return false;
  }
}

export async function createAdminSession(): Promise<void> {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const store = await cookies();
  store.set(COOKIE_NAME, sessionToken(expiresAt), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAdminSession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
