-- CreateTable
CREATE TABLE "SocialGraph" (
    "observerDid" TEXT NOT NULL,
    "targetDid" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialGraph_pkey" PRIMARY KEY ("observerDid","targetDid")
);

-- CreateIndex
CREATE INDEX "SocialGraph_observerDid_idx" ON "SocialGraph"("observerDid");

-- CreateIndex
CREATE INDEX "SocialGraph_targetDid_idx" ON "SocialGraph"("targetDid");
