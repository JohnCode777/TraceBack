CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Project" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "key" TEXT NOT NULL CHECK (length("key") BETWEEN 2 AND 5 AND "key" NOT GLOB '*[^A-Za-z]*'),
  "description" TEXT,
  "archivedAt" DATETIME,
  "nextBugNumber" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE "ProjectMember" (
  "projectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  PRIMARY KEY ("projectId", "userId"),
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Area" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Bug" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "severity" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Submitted',
  "reproducibility" TEXT,
  "areaId" TEXT,
  "reporterId" TEXT NOT NULL,
  "assigneeId" TEXT,
  "osName" TEXT,
  "osVersion" TEXT,
  "browserOrDevice" TEXT,
  "appVersion" TEXT,
  "envType" TEXT,
  "expectedBehaviour" TEXT,
  "actualBehaviour" TEXT,
  "extraContext" TEXT,
  "completenessScore" INTEGER NOT NULL DEFAULT 0,
  "completenessLevel" TEXT NOT NULL DEFAULT 'Incomplete',
  "reopenCount" INTEGER NOT NULL DEFAULT 0,
  "reproducedByDev" TEXT,
  "rootCauseCategory" TEXT,
  "resolutionSummary" TEXT,
  "fixReference" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "fixedAt" DATETIME,
  "verifiedAt" DATETIME,
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "ReproStep" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "bugId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "instruction" TEXT NOT NULL,
  FOREIGN KEY ("bugId") REFERENCES "Bug"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Note" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "bugId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "editedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("bugId") REFERENCES "Bug"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "StatusChange" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "bugId" TEXT NOT NULL,
  "fromStatus" TEXT NOT NULL,
  "toStatus" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "comment" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("bugId") REFERENCES "Bug"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Project_key_key" ON "Project"("key");
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");
CREATE UNIQUE INDEX "Area_projectId_name_key" ON "Area"("projectId", "name");
CREATE UNIQUE INDEX "Bug_projectId_number_key" ON "Bug"("projectId", "number");
CREATE INDEX "Bug_projectId_status_idx" ON "Bug"("projectId", "status");
CREATE INDEX "Bug_projectId_severity_idx" ON "Bug"("projectId", "severity");
CREATE INDEX "Bug_projectId_areaId_idx" ON "Bug"("projectId", "areaId");
CREATE INDEX "Bug_projectId_createdAt_idx" ON "Bug"("projectId", "createdAt");
CREATE UNIQUE INDEX "ReproStep_bugId_position_key" ON "ReproStep"("bugId", "position");
CREATE INDEX "Note_bugId_createdAt_idx" ON "Note"("bugId", "createdAt");
CREATE INDEX "StatusChange_bugId_createdAt_idx" ON "StatusChange"("bugId", "createdAt");

CREATE TRIGGER "StatusChange_no_update" BEFORE UPDATE ON "StatusChange"
BEGIN
  SELECT RAISE(ABORT, 'StatusChange is immutable');
END;

CREATE TRIGGER "StatusChange_no_delete" BEFORE DELETE ON "StatusChange"
BEGIN
  SELECT RAISE(ABORT, 'StatusChange is immutable');
END;
