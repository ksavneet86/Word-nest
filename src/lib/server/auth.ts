import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./db";
import type { Role } from "@prisma/client";

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

/** Reads the Clerk session and lazily upserts a `User` row on first authenticated request. */
export async function requireUser(): Promise<{ id: string; email: string; role: Role }> {
  const { userId } = await auth();
  if (!userId) throw new UnauthorizedError("Not signed in");

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses?.[0]?.emailAddress ??
    `${userId}@unknown.local`;

  return prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, email },
  });
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw new ForbiddenError("Admin access required");
  return user;
}
