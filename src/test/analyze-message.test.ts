import { describe, it, expect } from "vitest";
import { analyzeMessage, shouldShowEmergency } from "@/lib/analyze-message";
describe("threat scoring", () => {
  it("ongoing attack is critical and triggers emergency", () => {
    const a = analyzeMessage("Help me now, someone is breaking in to my house");
    expect(a.score).toBeGreaterThan(9.5);
    expect(shouldShowEmergency(a)).toBe(true);
  });
  it("death threat scores very severe", () => {
    expect(analyzeMessage("I will kill you tonight").score).toBeGreaterThanOrEqual(9);
  });
  it("plain cashback offer is low and uncertain", () => {
    const a = analyzeMessage("Get 5% cashback on your next order");
    expect(a.score).toBeLessThan(4);
    expect(a.uncertain).toBe(true);
    expect(shouldShowEmergency(a)).toBe(false);
  });
  it("long harmless message stays low", () => {
    expect(analyzeMessage("Hi, the meeting is moved to Monday. ".repeat(20)).score).toBeLessThan(2);
  });
  it("emergency only strictly above 9.5", () => {
    expect(shouldShowEmergency({ score: 9.5, immediateDanger: false })).toBe(false);
    expect(shouldShowEmergency({ score: 9.6, immediateDanger: false })).toBe(true);
  });
});
