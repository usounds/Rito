-- CreateTable
CREATE TABLE "public"."Bookmark" (
    "uri" TEXT NOT NULL,
    "did" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "ogp_title" TEXT,
    "ogp_description" TEXT,
    "ogp_image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "indexed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("uri")
);

-- CreateTable
CREATE TABLE "public"."Comment" (
    "id" SERIAL NOT NULL,
    "bookmark_uri" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "title" TEXT,
    "comment" TEXT,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BookmarkTag" (
    "bookmark_uri" TEXT NOT NULL,
    "tag_id" INTEGER NOT NULL,

    CONSTRAINT "BookmarkTag_pkey" PRIMARY KEY ("bookmark_uri","tag_id")
);

-- CreateTable
CREATE TABLE "public"."JetstreamIndex" (
    "service" TEXT NOT NULL,
    "index" INTEGER NOT NULL,

    CONSTRAINT "JetstreamIndex_pkey" PRIMARY KEY ("service")
);

-- CreateTable
CREATE TABLE "public"."Resolver" (
    "nsid" TEXT NOT NULL,
    "did" TEXT NOT NULL,
    "schema" TEXT,
    "verified" BOOLEAN NOT NULL,

    CONSTRAINT "Resolver_pkey" PRIMARY KEY ("nsid","did")
);

-- CreateIndex
CREATE INDEX "Comment_bookmark_uri_idx" ON "public"."Comment"("bookmark_uri");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "public"."Tag"("name");

-- CreateIndex
CREATE INDEX "BookmarkTag_bookmark_uri_idx" ON "public"."BookmarkTag"("bookmark_uri");

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_bookmark_uri_fkey" FOREIGN KEY ("bookmark_uri") REFERENCES "public"."Bookmark"("uri") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BookmarkTag" ADD CONSTRAINT "BookmarkTag_bookmark_uri_fkey" FOREIGN KEY ("bookmark_uri") REFERENCES "public"."Bookmark"("uri") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BookmarkTag" ADD CONSTRAINT "BookmarkTag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
