import { client } from "./client";
import type { PaginatedResponse } from "./types";

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
  const { data } = await client.get<PaginatedResponse<UserDto>>("/users", { params });
  return data;
}

export async function getUser(id: string) {
  const { data } = await client.get<UserDto>(`/users/${id}`);
  return data;
}

export async function createUser(payload: {
  email: string;
  password: string;
  role?: string;
  status?: string;
}) {
  const { data } = await client.post<UserDto>("/users", payload);
  return data;
}

export async function updateUser(
  id: string,
  payload: Partial<{ email: string; password: string; role?: string; status?: string }>,
) {
  const { data } = await client.put<UserDto>(`/users/${id}`, payload);
  return data;
}

export async function removeUser(id: string) {
  await client.delete(`/users/${id}`);
  return true;
}
