import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { BadRequestError } from "./api-utils";

/** Tries `baseName`, then "baseName (copy)" on a unique-constraint clash, before giving up. */
async function createWithNameRetry<T>(create: (name: string) => Promise<T>, baseName: string): Promise<T> {
  try {
    return await create(baseName);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      try {
        return await create(`${baseName} (copy)`);
      } catch (e2) {
        if (e2 instanceof Prisma.PrismaClientKnownRequestError && e2.code === "P2002") {
          throw new BadRequestError(`Something named "${baseName}" already exists there — rename the original first.`);
        }
        throw e2;
      }
    }
    throw e;
  }
}

async function cloneWords(sourceListId: string, targetListId: string) {
  const words = await prisma.word.findMany({ where: { wordListId: sourceListId } });
  if (!words.length) return;
  await prisma.word.createMany({
    data: words.map((w) => ({
      wordListId: targetListId,
      word: w.word,
      meaning: w.meaning,
      pos: w.pos,
      synonyms: w.synonyms,
      antonyms: w.antonyms,
      sentenceTip: w.sentenceTip,
      emoji: w.emoji,
      pictogramId: w.pictogramId,
      category: w.category,
      difficulty: w.difficulty,
      forms: w.forms as Prisma.InputJsonValue,
      needsMotion: w.needsMotion,
      visualQuery: w.visualQuery,
      gifUrl: w.gifUrl,
      // timesWrong/srsInterval/srsDue intentionally left at defaults — a copy starts fresh for its new learner
    })),
  });
}

export async function cloneListInto(sourceListId: string, targetFolderId: string) {
  const source = await prisma.wordList.findUniqueOrThrow({ where: { id: sourceListId } });
  const { _max } = await prisma.wordList.aggregate({ where: { folderId: targetFolderId }, _max: { order: true } });
  const created = await createWithNameRetry(
    (name) => prisma.wordList.create({ data: { folderId: targetFolderId, name, order: (_max.order ?? -1) + 1 } }),
    source.name
  );
  await cloneWords(sourceListId, created.id);
  return created;
}

export async function cloneFolderInto(sourceFolderId: string, targetLibraryId: string) {
  const source = await prisma.folder.findUniqueOrThrow({ where: { id: sourceFolderId }, include: { wordLists: true } });
  const { _max } = await prisma.folder.aggregate({ where: { libraryId: targetLibraryId }, _max: { order: true } });
  const created = await createWithNameRetry(
    (name) => prisma.folder.create({ data: { libraryId: targetLibraryId, name, order: (_max.order ?? -1) + 1 } }),
    source.name
  );
  for (const list of source.wordLists) {
    await cloneListInto(list.id, created.id);
  }
  return created;
}

export async function cloneLibraryInto(sourceLibraryId: string, targetLearnerId: string) {
  const source = await prisma.library.findUniqueOrThrow({ where: { id: sourceLibraryId }, include: { folders: true } });
  const { _max } = await prisma.library.aggregate({
    where: { learnerProfileId: targetLearnerId, section: source.section },
    _max: { order: true },
  });
  const created = await createWithNameRetry(
    (name) =>
      prisma.library.create({
        data: { learnerProfileId: targetLearnerId, section: source.section, name, order: (_max.order ?? -1) + 1 },
      }),
    source.name
  );
  for (const folder of source.folders) {
    await cloneFolderInto(folder.id, created.id);
  }
  return created;
}
