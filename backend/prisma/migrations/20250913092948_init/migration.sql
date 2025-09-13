/*
  Warnings:

  - You are about to drop the column `handle` on the `Bookmark` table. All the data in the column will be lost.
  - You are about to drop the column `handle` on the `Post` table. All the data in the column will be lost.
  - Added the required column `did` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Bookmark" DROP COLUMN "handle";

-- AlterTable
ALTER TABLE "public"."Post" DROP COLUMN "handle",
ADD COLUMN     "did" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "public"."UserDidHandle" (
    "did" TEXT NOT NULL,
    "handle" TEXT NOT NULL DEFAULT 'unknown',

    CONSTRAINT "UserDidHandle_pkey" PRIMARY KEY ("did")
);

-- AddForeignKey
ALTER TABLE "public"."Bookmark" ADD CONSTRAINT "Bookmark_did_fkey" FOREIGN KEY ("did") REFERENCES "public"."UserDidHandle"("did") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Post" ADD CONSTRAINT "Post_did_fkey" FOREIGN KEY ("did") REFERENCES "public"."UserDidHandle"("did") ON DELETE RESTRICT ON UPDATE CASCADE;
