import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { BadRequestError, PinRequiredError, PinInvalidError } from "./api-utils";

const PIN_RE = /^\d{4}$/;

/** Whether this account has a Parent PIN set. Never returns the hash itself. */
export async function parentHasPin(userId: string): Promise<boolean> {
  const row = await prisma.user.findUnique({ where: { id: userId }, select: { pinHash: true } });
  return !!row?.pinHash;
}

/**
 * Creates the account's Parent PIN, or changes it. Changing requires the current PIN, so a
 * child can't quietly reset it. The PIN is only ever stored as a bcrypt hash.
 */
export async function setParentPin(userId: string, pin: unknown, currentPin?: unknown): Promise<void> {
  if (typeof pin !== "string" || !PIN_RE.test(pin)) {
    throw new BadRequestError("PIN must be exactly 4 digits");
  }
  const row = await prisma.user.findUnique({ where: { id: userId }, select: { pinHash: true } });
  if (row?.pinHash) {
    if (typeof currentPin !== "string" || !(await bcrypt.compare(currentPin, row.pinHash))) {
      throw new PinInvalidError("Current PIN is incorrect");
    }
  }
  await prisma.user.update({ where: { id: userId }, data: { pinHash: await bcrypt.hash(pin, 10) } });
}

/**
 * Gate for destructive word actions. Throws PinRequiredError when no PIN exists yet (so the
 * client can offer to set one up) and PinInvalidError when the supplied PIN is wrong.
 */
export async function assertParentPin(userId: string, pin: unknown): Promise<void> {
  const row = await prisma.user.findUnique({ where: { id: userId }, select: { pinHash: true } });
  if (!row?.pinHash) throw new PinRequiredError("Set up a Parent PIN before deleting words.");
  if (typeof pin !== "string" || !(await bcrypt.compare(pin, row.pinHash))) {
    throw new PinInvalidError("That PIN isn't right.");
  }
}
