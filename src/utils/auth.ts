import { getPreferenceValues, LocalStorage } from "@raycast/api";

const TOKEN_STORAGE_KEY = "fly-auth-token";

// Module-level cache for the resolved token (set by WithValidToken on mount)
let _cachedToken: string | null = null;

/**
 * Get the auth token. Checks:
 * 1. Module-level cache (set by WithValidToken after resolving from LocalStorage)
 * 2. Preference value
 * Returns empty string if neither is available.
 */
export function getAuthToken(): string {
  if (_cachedToken) return _cachedToken;
  const { authToken } = getPreferenceValues<{ authToken?: string }>();
  return authToken ?? "";
}

/**
 * Resolve the token from all sources (async) and cache it.
 * Called by WithValidToken on mount.
 */
export async function resolveAndCacheToken(): Promise<string> {
  // Preference takes priority
  const { authToken } = getPreferenceValues<{ authToken?: string }>();
  if (authToken) {
    _cachedToken = authToken;
    return authToken;
  }

  // Fall back to LocalStorage (generated token)
  const stored = await LocalStorage.getItem<string>(TOKEN_STORAGE_KEY);
  if (stored) {
    _cachedToken = stored;
    return stored;
  }

  return "";
}

/**
 * Save a generated token to LocalStorage and update the cache.
 */
export async function saveGeneratedToken(token: string): Promise<void> {
  await LocalStorage.setItem(TOKEN_STORAGE_KEY, token);
  _cachedToken = token;
}
