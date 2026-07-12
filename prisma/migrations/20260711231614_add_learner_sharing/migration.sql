-- CreateTable
CREATE TABLE "LearnerAccess" (
    "id" TEXT NOT NULL,
    "learnerProfileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearnerAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearnerInvite" (
    "id" TEXT NOT NULL,
    "learnerProfileId" TEXT NOT NULL,
    "invitedEmail" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "LearnerInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LearnerAccess_learnerProfileId_userId_key" ON "LearnerAccess"("learnerProfileId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "LearnerInvite_token_key" ON "LearnerInvite"("token");

-- CreateIndex
CREATE INDEX "LearnerInvite_learnerProfileId_idx" ON "LearnerInvite"("learnerProfileId");

-- AddForeignKey
ALTER TABLE "LearnerAccess" ADD CONSTRAINT "LearnerAccess_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerAccess" ADD CONSTRAINT "LearnerAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerInvite" ADD CONSTRAINT "LearnerInvite_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
