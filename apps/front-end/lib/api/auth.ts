import { api } from "./client";
import type { AuthSessionResponse, LoginDto, RegisterDto, ForgotPasswordDto } from "@mh-os/shared";

export async function login(payload: LoginDto) {
  const { data } = await api.post<AuthSessionResponse>("/auth/login", payload);
  return data;
}

export async function me() {
  const { data } = await api.get<AuthSessionResponse>("/auth/me");
  return data;
}

export async function register(payload: RegisterDto) {
  const { data } = await api.post<AuthSessionResponse>("/auth/register", payload);
  return data;
}

export async function requestPasswordReset(payload: ForgotPasswordDto) {
  const { data } = await api.post<{ message: string }>("/auth/password/forgot", payload);
  return data;
}
