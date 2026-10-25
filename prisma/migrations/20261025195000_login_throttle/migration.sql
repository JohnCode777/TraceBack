CREATE TABLE "LoginThrottle" (
  "email" TEXT NOT NULL PRIMARY KEY,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "windowStartedAt" DATETIME NOT NULL
);
