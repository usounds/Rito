/*
  Warnings:

  - You are about to drop the column `moderation` on the `Bookmark` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Bookmark" DROP COLUMN "moderation";

-- CreateTable
CREATE TABLE "public"."Moderation" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Moderation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BookmarkModeration" (
    "bookmark_uri" TEXT NOT NULL,
    "moderation_id" INTEGER NOT NULL,

    CONSTRAINT "BookmarkModeration_pkey" PRIMARY KEY ("bookmark_uri","moderation_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Moderation_name_key" ON "public"."Moderation"("name");

-- CreateIndex
CREATE INDEX "BookmarkModeration_bookmark_uri_idx" ON "public"."BookmarkModeration"("bookmark_uri");

-- AddForeignKey
ALTER TABLE "public"."BookmarkModeration" ADD CONSTRAINT "BookmarkModeration_bookmark_uri_fkey" FOREIGN KEY ("bookmark_uri") REFERENCES "public"."Bookmark"("uri") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BookmarkModeration" ADD CONSTRAINT "BookmarkModeration_moderation_id_fkey" FOREIGN KEY ("moderation_id") REFERENCES "public"."Moderation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
