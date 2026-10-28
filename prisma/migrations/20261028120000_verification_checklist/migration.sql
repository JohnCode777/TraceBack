CREATE TABLE "VerificationAttempt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "bugId" TEXT NOT NULL,
  "verifierId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "problemOccurs" TEXT NOT NULL CHECK ("problemOccurs" IN ('Yes', 'No')),
  "finalComment" TEXT,
  "outcome" TEXT NOT NULL CHECK ("outcome" IN ('verified', 'reopened')),
  FOREIGN KEY ("bugId") REFERENCES "Bug"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("verifierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "VerificationAttempt_bugId_createdAt_idx" ON "VerificationAttempt"("bugId", "createdAt");

CREATE TABLE "VerificationStepResult" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "attemptId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "instruction" TEXT NOT NULL,
  "result" TEXT NOT NULL CHECK ("result" IN ('Pass', 'Fail')),
  "comment" TEXT,
  FOREIGN KEY ("attemptId") REFERENCES "VerificationAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "VerificationStepResult_attemptId_position_key" ON "VerificationStepResult"("attemptId", "position");

CREATE TRIGGER "VerificationAttempt_no_update" BEFORE UPDATE ON "VerificationAttempt"
BEGIN SELECT RAISE(ABORT, 'VerificationAttempt is immutable'); END;
CREATE TRIGGER "VerificationAttempt_no_delete" BEFORE DELETE ON "VerificationAttempt"
BEGIN SELECT RAISE(ABORT, 'VerificationAttempt is immutable'); END;
CREATE TRIGGER "VerificationStepResult_no_update" BEFORE UPDATE ON "VerificationStepResult"
BEGIN SELECT RAISE(ABORT, 'VerificationStepResult is immutable'); END;
CREATE TRIGGER "VerificationStepResult_no_delete" BEFORE DELETE ON "VerificationStepResult"
BEGIN SELECT RAISE(ABORT, 'VerificationStepResult is immutable'); END;
