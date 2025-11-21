BEGIN;
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "username" TEXT;
UPDATE "AdminUser" SET "username" = 'Admin' WHERE "username" IS NULL;
ALTER TABLE "AdminUser" ALTER COLUMN "username" SET NOT NULL;
DO $$
BEGIN
  BEGIN
    CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");
  EXCEPTION WHEN duplicate_table THEN
    NULL;
  END;
END
$$;
COMMIT;
