import "server-only";
import { prisma } from "./db";
import { NotFoundError } from "./api-utils";
import { ForbiddenError } from "./auth";
import type { SectionTree, WordForms } from "@/lib/types";
import type { Role, Section } from "@prisma/client";

type CurrentUser = { id: string; role: Role };

function assertOwns(ownerUserId: string, user: CurrentUser) {
  if (ownerUserId !== user.id && user.role !== "admin") {
    throw new ForbiddenError("You don't have access to this resource");
  }
}

export async function assertLibraryOwnership(libraryId: string, user: CurrentUser) {
  const library = await prisma.library.findUnique({
    where: { id: libraryId },
    include: { learnerProfile: true },
  });
  if (!library) throw new NotFoundError("Library not found");
  assertOwns(library.learnerProfile.ownerUserId, user);
  return library;
}

export async function assertFolderOwnership(folderId: string, user: CurrentUser) {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: { library: { include: { learnerProfile: true } } },
  });
  if (!folder) throw new NotFoundError("Folder not found");
  assertOwns(folder.library.learnerProfile.ownerUserId, user);
  return folder;
}

export async function assertListOwnership(listId: string, user: CurrentUser) {
  const list = await prisma.wordList.findUnique({
    where: { id: listId },
    include: { folder: { include: { library: { include: { learnerProfile: true } } } } },
  });
  if (!list) throw new NotFoundError("List not found");
  assertOwns(list.folder.library.learnerProfile.ownerUserId, user);
  return list;
}

export async function assertWordOwnership(wordId: string, user: CurrentUser) {
  const word = await prisma.word.findUnique({
    where: { id: wordId },
    include: { wordList: { include: { folder: { include: { library: { include: { learnerProfile: true } } } } } } },
  });
  if (!word) throw new NotFoundError("Word not found");
  assertOwns(word.wordList.folder.library.learnerProfile.ownerUserId, user);
  return word;
}

export async function getSectionTree(learnerProfileId: string, section: Section): Promise<SectionTree> {
  const libraries = await prisma.library.findMany({
    where: { learnerProfileId, section },
    include: {
      folders: {
        include: {
          wordLists: {
            include: { words: { orderBy: { addedAt: "asc" } } },
          },
        },
      },
    },
  });

  const tree: SectionTree = {};
  for (const lib of libraries) {
    tree[lib.name] = { id: lib.id, folders: {} };
    for (const folder of lib.folders) {
      tree[lib.name].folders[folder.name] = { id: folder.id, lists: {} };
      for (const list of folder.wordLists) {
        tree[lib.name].folders[folder.name].lists[list.name] = {
          id: list.id,
          words: list.words.map((w) => ({
            id: w.id,
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
            forms: (w.forms as WordForms) ?? {},
            needsMotion: w.needsMotion,
            visualQuery: w.visualQuery,
            gifUrl: w.gifUrl,
            timesWrong: w.timesWrong,
            srsInterval: w.srsInterval,
            srsDue: w.srsDue.getTime(),
            addedAt: w.addedAt.getTime(),
            _loc: {
              libraryId: lib.id,
              folderId: folder.id,
              listId: list.id,
              library: lib.name,
              folder: folder.name,
              list: list.name,
            },
          })),
        };
      }
    }
  }
  return tree;
}
