/*
  Warnings:

  - You are about to drop the column `target` on the `Like` table. All the data in the column will be lost.
  - Added the required column `subject` to the `Like` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Like_target_idx";

-- AlterTable
ALTER TABLE "public"."Like" DROP COLUMN "target",
ADD COLUMN     "subject" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Like_subject_idx" ON "public"."Like"("subject");
