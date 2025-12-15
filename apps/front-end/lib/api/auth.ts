import { apiFetch } from "./client.ts";
import type { AuthSessionResponse, LoginDto, RegisterDto, ForgotPasswordDto } from "@mh-os/shared";

// V1: login is disabled (read-only build)
export async function login(_payload: LoginDto): Promise<null> {
  return null;
}

export async function me() {
  const { data } = await apiFetch<AuthSessionResponse>("/auth/me");
  return data;
}

// V1: register is disabled (read-only build)
export async function register(_payload: RegisterDto): Promise<null> {
  return null;
}

// V1: password reset is disabled (read-only build)
export async function requestPasswordReset(_payload: ForgotPasswordDto): Promise<null> {
  return null;
}
