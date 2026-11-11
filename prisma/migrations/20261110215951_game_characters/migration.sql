-- AlterTable
ALTER TABLE "User" DROP COLUMN "characters";

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "citizenid" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "birthdate" TEXT,
    "gender" TEXT,
    "nationality" TEXT,
    "phone" TEXT,
    "jobName" TEXT,
    "jobLabel" TEXT,
    "jobGrade" TEXT,
    "onDuty" BOOLEAN NOT NULL DEFAULT false,
    "gangName" TEXT,
    "gangLabel" TEXT,
    "gangGrade" TEXT,
    "cash" INTEGER NOT NULL DEFAULT 0,
    "bank" INTEGER NOT NULL DEFAULT 0,
    "playtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "lastPlayedAt" TIMESTAMP(3),
    "gameUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Character_citizenid_key" ON "Character"("citizenid");

-- CreateIndex
CREATE INDEX "Character_userId_idx" ON "Character"("userId");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

