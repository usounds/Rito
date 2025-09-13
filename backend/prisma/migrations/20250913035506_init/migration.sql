/*
  Warnings:

  - You are about to drop the column `verified` on the `Bookmark` table. All the data in the column will be lost.
  - You are about to drop the `BookmarkModeration` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Moderation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."BookmarkModeration" DROP CONSTRAINT "BookmarkModeration_bookmark_uri_fkey";

-- DropForeignKey
ALTER TABLE "public"."BookmarkModeration" DROP CONSTRAINT "BookmarkModeration_moderation_id_fkey";

-- AlterTable
ALTER TABLE "public"."Bookmark" DROP COLUMN "verified",
ADD COLUMN     "moderation_result" TEXT;

-- AlterTable
ALTER TABLE "public"."Comment" ADD COLUMN     "moderation_result" TEXT;

-- DropTable
DROP TABLE "public"."BookmarkModeration";

-- DropTable
DROP TABLE "public"."Moderation";

-- CreateTable
CREATE TABLE "public"."Post" (
    "uri" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "lang" TEXT[],
    "moderation_result" TEXT,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("uri")
);
