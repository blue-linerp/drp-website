-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'PENDING', 'UNDER_REVIEW', 'INTERVIEW', 'ACCEPTED', 'DENIED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ApplicationCategory" AS ENUM ('WHITELIST', 'DEPARTMENT', 'STAFF', 'SPECIAL');

-- CreateEnum
CREATE TYPE "RuleCategory" AS ENUM ('GENERAL', 'GANGS', 'GOVERNMENT', 'BUSINESSES', 'DISCORD');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "globalName" TEXT,
    "avatar" TEXT,
    "discordCreatedAt" TIMESTAMP(3) NOT NULL,
    "guildJoinedAt" TIMESTAMP(3),
    "inGuild" BOOLEAN NOT NULL DEFAULT false,
    "roleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rolesSyncedAt" TIMESTAMP(3),
    "email" TEXT,
    "whitelisted" BOOLEAN NOT NULL DEFAULT false,
    "whitelistedAt" TIMESTAMP(3),
    "priorityBonus" INTEGER NOT NULL DEFAULT 0,
    "supporterTierId" TEXT,
    "supporterUntil" TIMESTAMP(3),
    "tebexTransaction" TEXT,
    "fivemLicense" TEXT,
    "steamHex" TEXT,
    "fivemId" TEXT,
    "lastIp" TEXT,
    "lastSeenInGame" TIMESTAMP(3),
    "playtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "isProfilePublic" BOOLEAN NOT NULL DEFAULT false,
    "dmNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationType" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "ApplicationCategory" NOT NULL,
    "department" TEXT,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'file-text',
    "image" TEXT,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "minAge" INTEGER,
    "minDiscordAgeDays" INTEGER NOT NULL DEFAULT 0,
    "requiredRoleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiresWhitelist" BOOLEAN NOT NULL DEFAULT false,
    "grantRoleId" TEXT,
    "grantsWhitelist" BOOLEAN NOT NULL DEFAULT false,
    "cooldownDays" INTEGER NOT NULL DEFAULT 14,
    "webhookUrl" TEXT,
    "questions" JSONB NOT NULL DEFAULT '[]',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "answers" JSONB NOT NULL,
    "reviewerId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "internalNotes" JSONB NOT NULL DEFAULT '[]',
    "history" JSONB NOT NULL DEFAULT '[]',
    "interviewAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ban" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "issuedById" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ban_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warning" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "issuedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Warning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupporterTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "interval" TEXT NOT NULL DEFAULT 'mo',
    "priority" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "benefits" TEXT[],
    "tebexPackageId" TEXT,
    "tebexUrl" TEXT,
    "discordRoleId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SupporterTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleSection" (
    "id" TEXT NOT NULL,
    "category" "RuleCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "pointsLabel" TEXT,
    "body" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RuleSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guide" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "cover" TEXT,
    "category" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readMinutes" INTEGER NOT NULL DEFAULT 3,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "helpfulYes" INTEGER NOT NULL DEFAULT 0,
    "helpfulNo" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuideVote" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "userId" TEXT,
    "helpful" BOOLEAN NOT NULL,

    CONSTRAINT "GuideVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqItem" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Creator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "twitchLogin" TEXT,
    "twitchId" TEXT,
    "youtubeChannelId" TEXT,
    "tiktok" TEXT,
    "kick" TEXT,
    "avatar" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "approved" BOOLEAN NOT NULL DEFAULT true,
    "characters" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Creator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "User_fivemLicense_key" ON "User"("fivemLicense");

-- CreateIndex
CREATE UNIQUE INDEX "User_fivemId_key" ON "User"("fivemId");

-- CreateIndex
CREATE INDEX "User_whitelisted_idx" ON "User"("whitelisted");

-- CreateIndex
CREATE INDEX "User_lastSeenInGame_idx" ON "User"("lastSeenInGame");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationType_slug_key" ON "ApplicationType"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Application_reference_key" ON "Application"("reference");

-- CreateIndex
CREATE INDEX "Application_userId_typeId_status_idx" ON "Application"("userId", "typeId", "status");

-- CreateIndex
CREATE INDEX "Application_status_submittedAt_idx" ON "Application"("status", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationDraft_userId_typeId_key" ON "ApplicationDraft"("userId", "typeId");

-- CreateIndex
CREATE INDEX "Ban_userId_active_idx" ON "Ban"("userId", "active");

-- CreateIndex
CREATE INDEX "Warning_userId_idx" ON "Warning"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SupporterTier_name_key" ON "SupporterTier"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RuleSection_slug_key" ON "RuleSection"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Guide_slug_key" ON "Guide"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "GuideVote_guideId_voterId_key" ON "GuideVote"("guideId", "voterId");

-- CreateIndex
CREATE UNIQUE INDEX "FaqItem_slug_key" ON "FaqItem"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Creator_userId_key" ON "Creator"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_supporterTierId_fkey" FOREIGN KEY ("supporterTierId") REFERENCES "SupporterTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ApplicationType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDraft" ADD CONSTRAINT "ApplicationDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDraft" ADD CONSTRAINT "ApplicationDraft_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ApplicationType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ban" ADD CONSTRAINT "Ban_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ban" ADD CONSTRAINT "Ban_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warning" ADD CONSTRAINT "Warning_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warning" ADD CONSTRAINT "Warning_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideVote" ADD CONSTRAINT "GuideVote_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideVote" ADD CONSTRAINT "GuideVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creator" ADD CONSTRAINT "Creator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
