"use server";

import "server-only";
import axios, { AxiosHeaders } from "axios";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@mh-os/shared";

const serverApiUrl =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:41000/api/v1";

const shouldDebugLog = process.env.NODE_ENV !== "production";

const serverApi = axios.create({
  baseURL: serverApiUrl,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

serverApi.interceptors.request.use((config) => {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (sessionCookie?.value) {
    const serialized = `${SESSION_COOKIE_NAME}=${sessionCookie.value}`;

    // ✅ Axios v1–safe header handling
    if (!config.headers) {
      config.headers = new AxiosHeaders();
    }

    if (config.headers instanceof AxiosHeaders) {
      const existing = config.headers.get("Cookie");
      config.headers.set(
        "Cookie",
        existing ? `${existing}; ${serialized}` : serialized
      );
    }
  }

  if (shouldDebugLog) {
    const fullUrl = `${config.baseURL ?? ""}${config.url ?? ""}`;
    const payload = config.data ?? config.params ?? null;
    console.info(
      `[server api request] ${config.method?.toUpperCase() ?? "GET"} ${fullUrl}`,
      payload
    );
  }

  return config;
});

serverApi.interceptors.response.use((response) => {
  if (shouldDebugLog) {
    const fullUrl = `${response.config.baseURL ?? ""}${response.config.url ?? ""}`;
    console.info(`[server api response] ${response.status} ${fullUrl}`);
  }

  const payload = response?.data;
  if (
    payload &&
    typeof payload === "object" &&
    "data" in (payload as Record<string, unknown>) &&
    "success" in (payload as Record<string, unknown>)
  ) {
    return { ...response, data: (payload as any).data };
  }

  return response;
});

export { serverApi };
