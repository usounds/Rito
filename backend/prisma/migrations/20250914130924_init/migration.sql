-- CreateTable
CREATE TABLE "public"."oauth_state" (
    "state" TEXT NOT NULL,
    "code_verifier" TEXT NOT NULL,
    "redirect_uri" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_state_pkey" PRIMARY KEY ("state")
);
