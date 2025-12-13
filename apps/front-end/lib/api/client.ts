
import axios, { AxiosInstance } from "axios";

const browserApiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:41000/api/v1";

const serverApiUrl =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:41000/api/v1";

const baseURL =
  typeof window === "undefined" ? serverApiUrl : browserApiUrl;

const shouldDebugLog = process.env.NODE_ENV !== "production";


// Defensive: ensure baseURL is always a string
const safeBaseURL = typeof baseURL === "string" ? baseURL : "";

/**
 * Canonical API client instance for all HTTP requests.
 * Always import as { apiClient } from this file for consistency.
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: safeBaseURL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});


let unauthorizedHandler: (() => void) | null = null;

/* =========================
   REQUEST INTERCEPTOR
========================= */
apiClient.interceptors.request.use((config) => {
  if (shouldDebugLog) {
    const fullUrl = `${config?.baseURL ?? ""}${config?.url ?? ""}`;
    const payload = config?.data ?? config?.params ?? null;
    console.info(
      `[api request] ${config?.method?.toUpperCase() ?? "GET"} ${fullUrl}`,
      payload,
    );
  }
  return config;
});

/* =========================
   RESPONSE INTERCEPTOR
========================= */
apiClient.interceptors.response.use(
  (response) => {
    if (shouldDebugLog) {
      const fullUrl = `${response?.config?.baseURL ?? ""}${response?.config?.url ?? ""}`;
      console.info(`[api response] ${response?.status ?? ""} ${fullUrl}`);
    }

    const payload = response?.data;

    // unwrap { success, data } envelopes
    if (
      payload &&
      typeof payload === "object" &&
      Object.prototype.hasOwnProperty.call(payload, "data")
    ) {
      return {
        ...response,
        data: (payload as Record<string, unknown>).data,
      };
    }

    return response;
  },
  async (error) => {
    // Defensive: always check for nested properties
    const message =
      error?.response?.data?.message ??
      error?.response?.data?.error ??
      error?.message ??
      "Request failed";

    if (error?.response?.status === 401) {
      if (unauthorizedHandler) unauthorizedHandler();

      if (
        typeof window !== "undefined" &&
        window.location?.pathname !== "/auth/login"
      ) {
        window.location.href = "/auth/login";
      }
    }

    if (shouldDebugLog) {
      const fullUrl = `${error?.config?.baseURL ?? ""}${error?.config?.url ?? ""}`;
      console.warn(
        `[api error] ${error?.response?.status ?? "ERR"} ${fullUrl} :: ${message}`,
      );
    }

    return Promise.reject(new Error(message));
  },
);


/* =========================
  HELPERS
========================= */


export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = typeof handler === "function" ? handler : null;
}


export function apiErrorMessage(err: unknown): string {
  const maybeAxios = err as {
    isAxiosError?: boolean;
    response?: any;
    message?: string;
  };

  if (maybeAxios?.isAxiosError && maybeAxios?.response) {
    const data = maybeAxios?.response?.data ?? {};
    const msg = data?.message ?? data?.error ?? maybeAxios?.message;
    if (typeof msg === "string") return msg;
    if (msg && typeof msg === "object") return JSON.stringify(msg);
  }

  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") return JSON.stringify(err);

  return "Unexpected error";
}


/* =========================
  EXPORTS (IMPORTANT)
========================= */

// Canonical export: always import as { apiClient }
export { apiClient };

// Backward compatibility (DO NOT REMOVE): legacy 'api' alias
export const api = apiClient;
