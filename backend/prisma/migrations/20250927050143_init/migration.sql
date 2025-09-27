/*
  Warnings:

  - The primary key for the `Like` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Like` table. All the data in the column will be lost.
  - Added the required column `aturi` to the `Like` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Like_did_target_key";

-- AlterTable
ALTER TABLE "public"."Like" DROP CONSTRAINT "Like_pkey",
DROP COLUMN "id",
ADD COLUMN     "aturi" TEXT NOT NULL,
ADD CONSTRAINT "Like_pkey" PRIMARY KEY ("aturi");
