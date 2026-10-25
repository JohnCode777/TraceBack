import { describe, expect, it } from "vitest";
import {
  decideTransition,
  statuses,
  transitions,
  type Role,
} from "../src/lib/state-machine";

const allowed = new Set(transitions.map(([from, to]) => `${from}:${to}`));
const base = {
  actorId: "tester",
  fixedById: "developer",
  resolutionSummary: "Corrected the data path",
  rootCauseCategory: "Logic error",
  reproducedByDev: "Yes",
  reason: "The issue still happens",
};

describe("lifecycle matrix", () => {
  for (const from of statuses) {
    for (const to of statuses) {
      const valid = allowed.has(`${from}:${to}`);
      const role: Role =
        to === "Fixed" || from === "Submitted" ? "Developer" : "Tester";
      it(`${from} → ${to} ${valid ? "is allowed" : "is rejected"}`, () => {
        const action = () => decideTransition({ ...base, from, to, role });
        if (valid) expect(action).not.toThrow();
        else expect(action).toThrow(/Cannot move/);
      });
    }
  }

  for (const [from, to] of transitions) {
    it(`rejects the wrong role for ${from} → ${to}`, () => {
      const wrong: Role =
        from === "Submitted" || to === "Fixed" ? "Tester" : "Developer";
      expect(() =>
        decideTransition({ ...base, from, to, role: wrong }),
      ).toThrow(/Role/);
    });
    it(`allows Admin for ${from} → ${to}`, () => {
      expect(() =>
        decideTransition({ ...base, from, to, role: "Admin" }),
      ).not.toThrow();
    });
  }

  it("requires all structured fix fields", () => {
    for (const field of [
      "resolutionSummary",
      "rootCauseCategory",
      "reproducedByDev",
    ] as const)
      expect(() =>
        decideTransition({
          ...base,
          from: "Investigating",
          to: "Fixed",
          role: "Developer",
          [field]: null,
        }),
      ).toThrow(/Fix requires/);
  });
  it("requires a reason for reopen and regression", () => {
    for (const from of ["Fixed", "Verified"] as const)
      expect(() =>
        decideTransition({
          ...base,
          from,
          to: "Investigating",
          role: "Tester",
          reason: "",
        }),
      ).toThrow(/reason/);
  });
  it("prevents the fixer from verifying except as Admin", () => {
    expect(() =>
      decideTransition({
        ...base,
        from: "Fixed",
        to: "Verified",
        role: "Tester",
        actorId: "developer",
      }),
    ).toThrow(/cannot verify/);
    expect(() =>
      decideTransition({
        ...base,
        from: "Fixed",
        to: "Verified",
        role: "Admin",
        actorId: "developer",
      }),
    ).not.toThrow();
  });
  it("marks both reopen and regression for count increment", () => {
    expect(
      decideTransition({
        ...base,
        from: "Fixed",
        to: "Investigating",
        role: "Tester",
      }).reopen,
    ).toBe(true);
    expect(
      decideTransition({
        ...base,
        from: "Verified",
        to: "Investigating",
        role: "Tester",
      }).reopen,
    ).toBe(true);
  });
});
