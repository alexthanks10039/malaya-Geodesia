import "server-only";

export async function isAdminAuthenticated(): Promise<boolean> {
  return true;
}

export async function requireAdminApi(): Promise<{ ok: true } | { ok: false; response: Response }> {
  return { ok: true };
}

// Kept as a compatibility shim for the existing auth route.
export async function loginAdmin(_candidate: string): Promise<boolean> {
  return true;
}

// No session cookie is required while Studio is intentionally open.
export async function createAdminSession(): Promise<void> {}

export async function clearAdminSession(): Promise<void> {}
