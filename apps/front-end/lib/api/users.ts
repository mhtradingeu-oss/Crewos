import { api } from "./client.ts";
import type { PaginatedResponse } from "./types.ts";

export interface UserDto {
  id: string;
  email: string;
  role: string;
  status: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export async function listUsers(params?: { search?: string; page?: number; pageSize?: number }) {
  const { data } = await api.get<PaginatedResponse<UserDto>>("/users", { params });
  return data;
}

export async function getUser(id: string) {
  const { data } = await api.get<UserDto>(`/users/${id}`);
  return data;
}

export async function createUser(payload: {
  email: string;
  password: string;
  role?: string;
  status?: string;
}) {
  const { data } = await api.post<UserDto>("/users", payload);
  return data;
}

export async function updateUser(
  id: string,
  payload: Partial<{ email: string; password: string; role?: string; status?: string }>,
) {
  const { data } = await api.put<UserDto>(`/users/${id}`, payload);
  return data;
}

export async function removeUser(id: string) {
  await api.delete(`/users/${id}`);
  return true;
}
