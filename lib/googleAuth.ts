/**
 * googleAuth.ts — Google OAuth 2.0 module for Expo.
 *
 * Uses expo-auth-session for the OAuth flow, expo-secure-store for
 * persistent token storage, and expo-web-browser for dismissing the
 * browser after the redirect.
 */

import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";

// ── Constants ────────────────────────────────────────────────────────────────

export const GOOGLE_CLIENT_ID = "177992048804-gukij19ltkpa66qkao4j5d8ud0lkds46.apps.googleusercontent.com";

// Reversed client ID — used as the redirect URI scheme on iOS
const REVERSED_CLIENT_ID = "com.googleusercontent.apps.177992048804-gukij19ltkpa66qkao4j5d8ud0lkds46";

const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

const SECURE_KEYS = {
  accessToken: "google_access_token",
  refreshToken: "google_refresh_token",
  tokenExpiry: "google_token_expiry",
  userEmail: "google_user_email",
  userName: "google_user_name",
} as const;

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT =
  "https://www.googleapis.com/oauth2/v2/userinfo";

// ── Types ────────────────────────────────────────────────────────────────────

export type GoogleAuthResult = {
  accessToken: string;
  email: string;
  name?: string;
};

export type GoogleAuthError = {
  code: "cancelled" | "network" | "token_refresh" | "unknown";
  message: string;
};

// ── Browser warm-up ──────────────────────────────────────────────────────────

WebBrowser.maybeCompleteAuthSession();

// ── Discovery document ───────────────────────────────────────────────────────

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: GOOGLE_TOKEN_ENDPOINT,
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

// ── Secure Store helpers ─────────────────────────────────────────────────────

async function storeTokens(
  accessToken: string,
  refreshToken: string | null,
  expiresIn: number,
  email: string,
  name?: string
): Promise<void> {
  const expiry = String(Date.now() + expiresIn * 1000);
  await Promise.all([
    SecureStore.setItemAsync(SECURE_KEYS.accessToken, accessToken),
    refreshToken
      ? SecureStore.setItemAsync(SECURE_KEYS.refreshToken, refreshToken)
      : Promise.resolve(),
    SecureStore.setItemAsync(SECURE_KEYS.tokenExpiry, expiry),
    SecureStore.setItemAsync(SECURE_KEYS.userEmail, email),
    name
      ? SecureStore.setItemAsync(SECURE_KEYS.userName, name)
      : Promise.resolve(),
  ]);
}

async function clearTokens(): Promise<void> {
  await Promise.all(
    Object.values(SECURE_KEYS).map((key) =>
      SecureStore.deleteItemAsync(key).catch(() => {})
    )
  );
}

// ── Fetch user info ──────────────────────────────────────────────────────────

async function fetchUserInfo(
  accessToken: string
): Promise<{ email: string; name?: string }> {
  const res = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`User info fetch failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as { email?: string; name?: string };
  if (!data.email) {
    throw new Error("Google userinfo did not return an email address");
  }
  return { email: data.email, name: data.name };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Initiate Google OAuth sign-in flow.
 * Opens the system browser, user authenticates, tokens are stored securely.
 */
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  const redirectUri = `${REVERSED_CLIENT_ID}:/oauthredirect`;

  const request = new AuthSession.AuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    redirectUri,
    scopes: SCOPES,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    extraParams: {
      access_type: "offline",
      prompt: "consent",
    },
  });

  const result = await request.promptAsync(discovery);

  if (result.type === "cancel" || result.type === "dismiss") {
    const err: GoogleAuthError = { code: "cancelled", message: "Sign-in was cancelled" };
    throw err;
  }

  if (result.type !== "success" || !result.params.code) {
    const err: GoogleAuthError = {
      code: "unknown",
      message: `Authentication failed: ${result.type}`,
    };
    throw err;
  }

  // Exchange authorization code for tokens
  const tokenResult = await AuthSession.exchangeCodeAsync(
    {
      clientId: GOOGLE_CLIENT_ID,
      code: result.params.code,
      redirectUri,
      extraParams: { code_verifier: request.codeVerifier ?? "" },
    },
    discovery
  );

  const accessToken = tokenResult.accessToken;
  const refreshToken = tokenResult.refreshToken ?? null;
  const expiresIn = tokenResult.expiresIn ?? 3600;

  // Fetch user profile
  const { email, name } = await fetchUserInfo(accessToken);

  // Persist tokens
  await storeTokens(accessToken, refreshToken, expiresIn, email, name);

  return { accessToken, email, name };
}

/**
 * Refresh the access token using the stored refresh token.
 * Throws if no refresh token is available.
 */
export async function refreshAccessToken(): Promise<string> {
  const refreshToken = await SecureStore.getItemAsync(SECURE_KEYS.refreshToken);
  if (!refreshToken) {
    const err: GoogleAuthError = {
      code: "token_refresh",
      message: "No refresh token available — please sign in again",
    };
    throw err;
  }

  const tokenResult = await AuthSession.refreshAsync(
    { clientId: GOOGLE_CLIENT_ID, refreshToken },
    discovery
  );

  const accessToken = tokenResult.accessToken;
  const expiresIn = tokenResult.expiresIn ?? 3600;
  const expiry = String(Date.now() + expiresIn * 1000);

  await Promise.all([
    SecureStore.setItemAsync(SECURE_KEYS.accessToken, accessToken),
    SecureStore.setItemAsync(SECURE_KEYS.tokenExpiry, expiry),
  ]);

  return accessToken;
}

/**
 * Get a valid access token, refreshing if expired.
 * Returns null if no tokens are stored.
 */
export async function getAccessToken(): Promise<string | null> {
  const [token, expiryStr] = await Promise.all([
    SecureStore.getItemAsync(SECURE_KEYS.accessToken),
    SecureStore.getItemAsync(SECURE_KEYS.tokenExpiry),
  ]);

  if (!token) return null;

  // Check if expired (with 60s buffer); refresh if needed.
  if (expiryStr) {
    const expiry = parseInt(expiryStr, 10);
    if (Date.now() > expiry - 60_000) {
      return refreshAccessToken();
    }
  }

  return token;
}

/**
 * Returns true if the user has a stored refresh token (i.e. is signed in).
 * A refresh token means we can always obtain a valid access token,
 * even if the current access token has expired.
 */
export async function isSignedIn(): Promise<boolean> {
  const token = await SecureStore.getItemAsync(SECURE_KEYS.refreshToken);
  return token !== null && token.length > 0;
}

/**
 * Get the stored user email (or null if not signed in).
 */
export async function getStoredEmail(): Promise<string | null> {
  return SecureStore.getItemAsync(SECURE_KEYS.userEmail);
}

/**
 * Sign out — clear all stored tokens and user info.
 */
export async function signOut(): Promise<void> {
  await clearTokens();
}
