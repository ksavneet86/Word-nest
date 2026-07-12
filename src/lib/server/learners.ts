import "server-only";
import { prisma } from "./db";
import { NotFoundError } from "./api-utils";
import { ForbiddenError } from "./auth";
import { ELEVEN_PLUS_WORDS, ELEVEN_PLUS_EXTENDED_WORDS, difficultyForWord } from "@/lib/constants";
import type { Role } from "@prisma/client";

type CurrentUser = { id: string; role: Role };

/** True if the user owns, has been granted access to, or (as admin) can see this learner. */
export async function hasLearnerAccess(learnerProfileId: string, ownerUserId: string, user: CurrentUser) {
  if (ownerUserId === user.id || user.role === "admin") return true;
  const access = await prisma.learnerAccess.findUnique({
    where: { learnerProfileId_userId: { learnerProfileId, userId: user.id } },
  });
  return !!access;
}

export async function getLearnerOrThrow(learnerProfileId: string, user: CurrentUser) {
  const learner = await prisma.learnerProfile.findUnique({ where: { id: learnerProfileId } });
  if (!learner) throw new NotFoundError("Learner not found");
  if (!(await hasLearnerAccess(learnerProfileId, learner.ownerUserId, user))) {
    throw new ForbiddenError("You don't have access to this learner");
  }
  return learner;
}

/** Owner-only check — for sharing/invite management, distinct from general read/write access. */
export async function getOwnedLearnerOrThrow(learnerProfileId: string, user: CurrentUser) {
  const learner = await prisma.learnerProfile.findUnique({ where: { id: learnerProfileId } });
  if (!learner) throw new NotFoundError("Learner not found");
  if (learner.ownerUserId !== user.id && user.role !== "admin") {
    throw new ForbiddenError("Only the learner's owner can manage sharing");
  }
  return learner;
}

export async function listLearners(user: CurrentUser, all: boolean) {
  if (all && user.role === "admin") {
    return prisma.learnerProfile.findMany({
      include: { owner: { select: { email: true } } },
      orderBy: { createdAt: "asc" },
    });
  }
  return prisma.learnerProfile.findMany({
    where: { OR: [{ ownerUserId: user.id }, { access: { some: { userId: user.id } } }] },
    orderBy: { createdAt: "asc" },
  });
}

/** Seeds the 11+ core list + extended-list generation queue, mirroring freshProfile()/buildElevenPlusSeed() in the reference artifact. */
export async function createLearner(user: CurrentUser, name: string, avatarEmoji?: string) {
  return prisma.$transaction(async (tx) => {
    const learner = await tx.learnerProfile.create({
      data: { ownerUserId: user.id, name, avatarEmoji: avatarEmoji ?? null },
    });

    const library = await tx.library.create({
      data: { learnerProfileId: learner.id, section: "elevenPlus", name: "11+ Vocabulary (by Claude)" },
    });
    const folder = await tx.folder.create({ data: { libraryId: library.id, name: "General" } });
    const coreList = await tx.wordList.create({ data: { folderId: folder.id, name: "Core List" } });
    await tx.wordList.create({ data: { folderId: folder.id, name: "Extended List (500+ words)" } });

    await tx.word.createMany({
      data: ELEVEN_PLUS_WORDS.map(([word, meaning, pos, synonyms, antonyms, sentenceTip, emoji]) => ({
        wordListId: coreList.id,
        word,
        meaning,
        pos,
        synonyms,
        antonyms,
        sentenceTip,
        emoji,
        category: "other",
        difficulty: difficultyForWord(word),
      })),
    });

    await tx.extendedQueue.create({
      data: { learnerProfileId: learner.id, remainingWords: ELEVEN_PLUS_EXTENDED_WORDS },
    });

    return learner;
  });
}
