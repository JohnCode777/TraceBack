DROP TRIGGER "StatusChange_no_delete";
CREATE TRIGGER "StatusChange_no_delete" BEFORE DELETE ON "StatusChange"
WHEN NOT EXISTS (
  SELECT 1
  FROM "Bug" AS b
  JOIN "Project" AS p ON p."id" = b."projectId"
  WHERE b."id" = OLD."bugId"
    AND p."archivedAt" IS NOT NULL
    AND p."nextBugNumber" = 0
)
BEGIN
  SELECT RAISE(ABORT, 'StatusChange is immutable');
END;
