CREATE INDEX "Bug_projectId_status_createdAt_idx" ON "Bug"("projectId", "status", "createdAt");
CREATE INDEX "Bug_projectId_severity_createdAt_idx" ON "Bug"("projectId", "severity", "createdAt");
CREATE INDEX "Bug_projectId_areaId_createdAt_idx" ON "Bug"("projectId", "areaId", "createdAt");
CREATE INDEX "Bug_projectId_completenessLevel_createdAt_idx" ON "Bug"("projectId", "completenessLevel", "createdAt");
