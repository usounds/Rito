-- CreateTable
CREATE TABLE "public"."Like" (
    "id" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "did" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Like_target_idx" ON "public"."Like"("target");

-- CreateIndex
CREATE UNIQUE INDEX "Like_did_target_key" ON "public"."Like"("did", "target");
