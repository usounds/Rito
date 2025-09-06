/*
  Warnings:

  - You are about to drop the `Resolver` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "public"."jetstreamindex" ALTER COLUMN "index" SET DATA TYPE BIGINT;

-- DropTable
DROP TABLE "public"."Resolver";

-- CreateTable
CREATE TABLE "public"."resolver" (
    "nsid" TEXT NOT NULL,
    "did" TEXT NOT NULL,
    "schema" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL,

    CONSTRAINT "resolver_pkey" PRIMARY KEY ("nsid","did")
);
