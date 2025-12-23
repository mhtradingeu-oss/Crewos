import type { Prisma, User } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { notFound } from "../../http/errors.js";

export async function findUsers(params: Prisma.UserFindManyArgs = {}): Promise<User[]> {
  return prisma.user.findMany(params);
}

export async function findUserById(id: string, select?: Prisma.UserSelect): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { id }, select });
  if (!user) throw notFound("User not found");
  return user;
}

export async function updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
  return prisma.user.update({ where: { id }, data });
}

export async function updateUserStatus(id: string, status: string): Promise<User> {
  return prisma.user.update({ where: { id }, data: { status } });
}

export async function updateUserRole(id: string, role: string): Promise<User> {
  return prisma.user.update({ where: { id }, data: { role } });
}
