-- AlterTable
ALTER TABLE "LearnerProfile" ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unlockedAvatars" TEXT[] DEFAULT ARRAY[]::TEXT[];
