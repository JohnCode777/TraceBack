import type { DatabaseSync } from "node:sqlite";
import { evaluate, type CompletenessInput } from "../src/lib/completeness";

export function backfillCompleteness(database: DatabaseSync): number {
  const bugs = database
    .prepare(
      `SELECT id, title, severity, areaId, osName,
    browserOrDevice, appVersion, expectedBehaviour, actualBehaviour,
    reproducibility, extraContext FROM "Bug"`,
    )
    .all() as ({ id: string } & CompletenessInput)[];
  const steps = database.prepare(
    'SELECT instruction FROM "ReproStep" WHERE bugId = ? ORDER BY position',
  );
  const update = database.prepare(
    'UPDATE "Bug" SET completenessScore = ?, completenessLevel = ? WHERE id = ?',
  );
  for (const bug of bugs) {
    const result = evaluate({
      ...bug,
      steps: steps.all(bug.id) as { instruction: string }[],
    });
    update.run(result.score, result.level, bug.id);
  }
  return bugs.length;
}
