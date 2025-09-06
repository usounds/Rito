/*
  Warnings:

  - You are about to drop the `JetstreamIndex` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."JetstreamIndex";

-- CreateTable
CREATE TABLE "public"."jetstreamindex" (
    "service" TEXT NOT NULL,
    "index" INTEGER NOT NULL,

    CONSTRAINT "jetstreamindex_pkey" PRIMARY KEY ("service")
);
