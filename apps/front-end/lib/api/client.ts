import axios from "axios";
import { clearToken, getToken, setToken } from "@/lib/auth/token";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1",
});

let unauthorizedHandler: (() => void) | null = null;

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const payload = response?.data;
    if (
      payload &&
      typeof payload === "object" &&
      "data" in (payload as Record<string, unknown>) &&
      "success" in (payload as Record<string, unknown>)
    ) {
      return { ...response, data: (payload as Record<string, unknown>).data };
    }
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ??
      error.response?.data?.error ??
      error.message ??
      "Request failed";
    if (error.response?.status === 401) {
      clearToken();
      if (unauthorizedHandler) unauthorizedHandler();
      if (typeof window !== "undefined" && window.location.pathname !== "/auth/login") {
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(new Error(message));
  },
);

export function updateToken(token: string) {
  setToken(token);
}

export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler;
}

export function apiErrorMessage(err: unknown) {
  // Handle Axios-style errors with structured response payloads
  const maybeAxios = err as { isAxiosError?: boolean; response?: any; message?: string };
  if (maybeAxios?.isAxiosError && maybeAxios.response) {
    const data = maybeAxios.response.data ?? {};
    const msg = data.message ?? data.error ?? maybeAxios.message;
    if (typeof msg === "string") return msg;
    if (msg && typeof msg === "object") return JSON.stringify(msg);
  }
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") return JSON.stringify(err);
  return "Unexpected error";
}

export { api };
