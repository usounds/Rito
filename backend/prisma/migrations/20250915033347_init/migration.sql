/*
  Warnings:

  - You are about to drop the column `urls` on the `Post` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Post" DROP COLUMN "urls";

-- CreateTable
CREATE TABLE "public"."PostUrl" (
    "id" SERIAL NOT NULL,
    "postUri" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "PostUrl_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostUrl_postUri_idx" ON "public"."PostUrl"("postUri");

-- AddForeignKey
ALTER TABLE "public"."PostUrl" ADD CONSTRAINT "PostUrl_postUri_fkey" FOREIGN KEY ("postUri") REFERENCES "public"."Post"("uri") ON DELETE RESTRICT ON UPDATE CASCADE;
