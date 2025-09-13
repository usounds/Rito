/*
  Warnings:

  - A unique constraint covering the columns `[bookmark_uri,lang]` on the table `Comment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Comment_bookmark_uri_lang_key" ON "public"."Comment"("bookmark_uri", "lang");
