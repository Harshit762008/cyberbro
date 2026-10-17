import { describe, expect, it } from "vitest";
import { assessDevice, DEVICE_CHECKS, type Observations } from "@/lib/device-assessment";

describe("Evidence-only device assessment", () => {
  it("does not report a clean scan without collected answers", () => {
    expect(assessDevice({}).state).toBe("Scan incomplete");
    expect(assessDevice({}).checked).toBe(0);
  });
  it("does not infer compromise from heat or battery drain alone", () => {
    const report = assessDevice({ symptoms: { answer: "yes", detail: "Overheating and battery drain" } });
    expect(report.state).toBe("Scan incomplete");
    expect(report.findings[0]?.severity).toBe("Informational");
  });
  it("reports only user-supplied evidence for an active warning", () => {
    const report = assessDevice({ warning: { answer: "yes", detail: "Play Protect shows an active warning" } });
    expect(report.state).toBe("Potential threat found");
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]?.evidence).toBe("You reported: Play Protect shows an active warning");
    expect(report.findings[0]?.confidence).toBe("Unverified user report");
  });
  it("requires every item to be checked before a no-issues report", () => {
    const answers: Observations = {};
    for (const { id } of DEVICE_CHECKS) answers[id] = { answer: "no", detail: "" };
    expect(assessDevice(answers).state).toBe("No issues detected in checked items");
    answers.permissions = { answer: "unknown", detail: "" };
    expect(assessDevice(answers).state).toBe("Scan incomplete");
  });
});