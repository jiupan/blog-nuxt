ALTER TABLE "User" ADD COLUMN "displayName" TEXT;

CREATE TABLE "UserAvatar" (
    "id" UUID NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "image" BYTEA NOT NULL
);
CREATE UNIQUE INDEX "UserAvatar_userId_key" ON "UserAvatar"("userId");
