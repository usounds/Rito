/*
  Warnings:

  - You are about to drop the `oauth_state` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."oauth_state";

-- CreateTable
CREATE TABLE "public"."OAuthState" (
    "state" TEXT NOT NULL,
    "code_verifier" TEXT NOT NULL,
    "redirect_uri" TEXT NOT NULL,
    "return_to" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthState_pkey" PRIMARY KEY ("state")
);
