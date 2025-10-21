-- CreateTable
CREATE TABLE "public"."NodeOAuthState" (
    "key" TEXT NOT NULL,
    "state" TEXT NOT NULL,

    CONSTRAINT "NodeOAuthState_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."NodeOAuthSession" (
    "key" TEXT NOT NULL,
    "session" TEXT NOT NULL,

    CONSTRAINT "NodeOAuthSession_pkey" PRIMARY KEY ("key")
);
