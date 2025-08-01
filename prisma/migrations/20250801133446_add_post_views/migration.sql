-- CreateTable
CREATE TABLE "post_views" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "post_id" INTEGER NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_views_post_id_viewed_at_idx" ON "post_views"("post_id", "viewed_at");

-- CreateIndex
CREATE INDEX "post_views_user_id_viewed_at_idx" ON "post_views"("user_id", "viewed_at");

-- CreateIndex
CREATE UNIQUE INDEX "post_views_user_id_post_id_key" ON "post_views"("user_id", "post_id");

-- AddForeignKey
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
