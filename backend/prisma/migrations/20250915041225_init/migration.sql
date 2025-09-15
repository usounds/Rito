/*
  Warnings:

  - You are about to drop the `PostUrl` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."PostUrl" DROP CONSTRAINT "PostUrl_postUri_fkey";

-- DropTable
DROP TABLE "public"."PostUrl";

-- CreateTable
CREATE TABLE "public"."PostUri" (
    "id" SERIAL NOT NULL,
    "postUri" TEXT NOT NULL,
    "uri" TEXT NOT NULL,

    CONSTRAINT "PostUri_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostUri_postUri_idx" ON "public"."PostUri"("postUri");

-- AddForeignKey
ALTER TABLE "public"."PostUri" ADD CONSTRAINT "PostUri_postUri_fkey" FOREIGN KEY ("postUri") REFERENCES "public"."Post"("uri") ON DELETE RESTRICT ON UPDATE CASCADE;
