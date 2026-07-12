-- CreateEnum
CREATE TYPE "Role" AS ENUM ('guardian', 'admin');

-- CreateEnum
CREATE TYPE "Section" AS ENUM ('vocab', 'spelling', 'elevenPlus', 'synAnt');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('low', 'moderate', 'high');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('quiz', 'blank', 'sentence');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'guardian',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearnerProfile" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarEmoji" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "pinHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Library" (
    "id" TEXT NOT NULL,
    "learnerProfileId" TEXT NOT NULL,
    "section" "Section" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Library_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordList" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WordList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Word" (
    "id" TEXT NOT NULL,
    "wordListId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "pos" TEXT,
    "synonyms" TEXT[],
    "antonyms" TEXT[],
    "sentenceTip" TEXT,
    "emoji" TEXT,
    "pictogramId" TEXT,
    "category" TEXT NOT NULL DEFAULT 'other',
    "difficulty" "Difficulty" NOT NULL DEFAULT 'low',
    "forms" JSONB NOT NULL DEFAULT '{}',
    "needsMotion" BOOLEAN NOT NULL DEFAULT false,
    "visualQuery" TEXT,
    "gifUrl" TEXT,
    "timesWrong" INTEGER NOT NULL DEFAULT 0,
    "srsInterval" INTEGER NOT NULL DEFAULT 0,
    "srsDue" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizSession" (
    "id" TEXT NOT NULL,
    "learnerProfileId" TEXT NOT NULL,
    "type" "SessionType" NOT NULL,
    "section" "Section" NOT NULL,
    "listId" TEXT,
    "correct" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackReport" (
    "id" TEXT NOT NULL,
    "learnerProfileId" TEXT NOT NULL,
    "reportText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtendedQueue" (
    "id" TEXT NOT NULL,
    "learnerProfileId" TEXT NOT NULL,
    "remainingWords" TEXT[],

    CONSTRAINT "ExtendedQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "LearnerProfile_ownerUserId_idx" ON "LearnerProfile"("ownerUserId");

-- CreateIndex
CREATE INDEX "Library_learnerProfileId_section_idx" ON "Library"("learnerProfileId", "section");

-- CreateIndex
CREATE UNIQUE INDEX "Library_learnerProfileId_section_name_key" ON "Library"("learnerProfileId", "section", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Folder_libraryId_name_key" ON "Folder"("libraryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "WordList_folderId_name_key" ON "WordList"("folderId", "name");

-- CreateIndex
CREATE INDEX "Word_wordListId_idx" ON "Word"("wordListId");

-- CreateIndex
CREATE INDEX "QuizSession_learnerProfileId_createdAt_idx" ON "QuizSession"("learnerProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "FeedbackReport_learnerProfileId_createdAt_idx" ON "FeedbackReport"("learnerProfileId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExtendedQueue_learnerProfileId_key" ON "ExtendedQueue"("learnerProfileId");

-- AddForeignKey
ALTER TABLE "LearnerProfile" ADD CONSTRAINT "LearnerProfile_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Library" ADD CONSTRAINT "Library_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordList" ADD CONSTRAINT "WordList_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_wordListId_fkey" FOREIGN KEY ("wordListId") REFERENCES "WordList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSession" ADD CONSTRAINT "QuizSession_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackReport" ADD CONSTRAINT "FeedbackReport_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtendedQueue" ADD CONSTRAINT "ExtendedQueue_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
