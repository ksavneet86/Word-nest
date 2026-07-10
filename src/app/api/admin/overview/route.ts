import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/api-utils";
import { prisma } from "@/lib/server/db";
import { wordStatus } from "@/lib/server/srs";

export async function GET() {
  try {
    await requireAdmin();

    const users = await prisma.user.findMany({
      where: { role: "guardian" },
      orderBy: { createdAt: "asc" },
      include: {
        learnerProfiles: {
          orderBy: { createdAt: "asc" },
          include: {
            libraries: {
              include: { folders: { include: { wordLists: { include: { words: true } } } } },
            },
          },
        },
      },
    });

    const guardians = users.map((u) => ({
      email: u.email,
      learners: u.learnerProfiles.map((l) => {
        const words = l.libraries.flatMap((lib) => lib.folders.flatMap((f) => f.wordLists.flatMap((wl) => wl.words)));
        const mastered = words.filter((w) => wordStatus(w) === "mastered").length;
        return {
          id: l.id,
          name: l.name,
          totalWords: words.length,
          masteredWords: mastered,
          masteredPercent: words.length ? Math.round((mastered / words.length) * 100) : 0,
        };
      }),
    }));

    return NextResponse.json({ guardians });
  } catch (e) {
    return handleApiError(e);
  }
}
