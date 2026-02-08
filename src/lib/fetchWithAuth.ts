/**
 * Fetch wrapper that automatically handles token refresh on 401 responses.
 *
 * - Reads access token from localStorage
 * - Proactively refreshes if the token is expired (based on JWT `exp` claim)
 * - On 401 response, attempts a refresh and retries the request once
 * - Uses a shared promise to prevent concurrent refresh calls
 */

let refreshPromise: Promise<boolean> | null = null;

function getAuthFromStorage(): {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string | null; role: string };
} | null {
  try {
    const stored = localStorage.getItem('auth');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed.accessToken && parsed.refreshToken && parsed.user) return parsed;
  } catch {}
  return null;
}

/** Decode JWT and check if it expires within the next 30 seconds */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now() + 30_000;
  } catch {
    return true;
  }
}

async function tryRefresh(): Promise<boolean> {
  const auth = getAuthFromStorage();
  if (!auth?.refreshToken) return false;
  try {
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
    });
    if (!res.ok) return false;

    const tokens: { accessToken: string; refreshToken: string } = await res.json();
    const newAuth = {
      user: auth.user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
    localStorage.setItem('auth', JSON.stringify(newAuth));
    document.cookie = `accessToken=${tokens.accessToken}; path=/; max-age=${24 * 60 * 60}; samesite=lax`;
    return true;
  } catch {
    return false;
  }
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  let auth = getAuthFromStorage();

  // Proactively refresh if token is about to expire
  if (auth?.accessToken && isTokenExpired(auth.accessToken)) {
    if (!refreshPromise) {
      refreshPromise = tryRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    const refreshed = await refreshPromise;
    if (refreshed) {
      auth = getAuthFromStorage();
    }
  }

  const headers = new Headers(options.headers);
  if (auth?.accessToken) {
    headers.set('Authorization', `Bearer ${auth.accessToken}`);
  }

  let res = await fetch(url, { ...options, headers });

  // If 401, try one refresh + retry
  if (res.status === 401 && auth?.refreshToken) {
    if (!refreshPromise) {
      refreshPromise = tryRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    const refreshed = await refreshPromise;
    if (refreshed) {
      auth = getAuthFromStorage();
      const retryHeaders = new Headers(options.headers);
      if (auth?.accessToken) {
        retryHeaders.set('Authorization', `Bearer ${auth.accessToken}`);
      }
      res = await fetch(url, { ...options, headers: retryHeaders });
    }
  }

  return res;
}
