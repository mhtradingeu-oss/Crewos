const TOKEN_KEY = "mh_os_token";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const matches = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`));
  if (!matches) return null;
  const [, value] = matches.split("=");
  return value ?? null;
}

function buildCookie(value: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${TOKEN_KEY}=${value}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

export function getToken(): string | null {
  if (typeof document === "undefined") return null;
  return getCookieValue(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof document === "undefined") return;
  document.cookie = buildCookie(token);
}

export function clearToken() {
  if (typeof document === "undefined") return;
  document.cookie = `${TOKEN_KEY}=; Path=/; Max-Age=0; SameSite=Lax;`;
}
