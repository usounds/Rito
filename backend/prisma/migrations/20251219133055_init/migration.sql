-- CreateTable
CREATE TABLE "PostToBookmark" (
    "sub" TEXT NOT NULL,

    CONSTRAINT "PostToBookmark_pkey" PRIMARY KEY ("sub")
);

-- CreateIndex
CREATE INDEX "PostToBookmark_sub_idx" ON "PostToBookmark"("sub");
