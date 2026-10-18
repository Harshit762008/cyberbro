import { describe, expect, it } from "vitest";
import { BROWSER_CHECKS, evaluateBrowserCheck, summarizeBrowserChecks, type BrowserSnapshot, type BrowserCheck } from "@/lib/browser-device-checks";

const secure: BrowserSnapshot = { secureContext: true, protocol: "https:", localHost: false, cryptoAvailable: true, embedding: "top-level" };
describe("Automatic evidence-only browser assessment", () => {
  it("flags actual unencrypted non-local transport", () => {
    expect(evaluateBrowserCheck("transport", { ...secure, protocol: "http:" }).status).toBe("attention");
  });
  it("does not treat localhost HTTP as verified HTTPS or a threat", () => {
    expect(evaluateBrowserCheck("transport", { ...secure, protocol: "http:", localHost: true }).status).toBe("informational");
  });
  it("reports unsupported cryptography as unavailable, not passed", () => {
    expect(evaluateBrowserCheck("crypto", { ...secure, cryptoAvailable: false }).status).toBe("unavailable");
  });
  it("never calls an incomplete OS assessment a clean device scan", () => {
    const checks: BrowserCheck[] = BROWSER_CHECKS.map(({ id }) => ({ ...evaluateBrowserCheck(id, secure), status: "passed" }));
    const summary = summarizeBrowserChecks(checks);
    expect(summary.state).toBe("Scan incomplete");
    expect(summary.checkedState).toBe("No issues found in checked items");
    expect(summary.completed).toBe(5);
    expect(summary.unavailable).toBe(4);
  });
  it("does not infer compromise from cross-origin embedding", () => {
    expect(evaluateBrowserCheck("frame", { ...secure, embedding: "cross-origin" }).status).toBe("informational");
  });
  it("reports attention based on collected evidence", () => {
    expect(summarizeBrowserChecks([evaluateBrowserCheck("context", { ...secure, secureContext: false })]).state).toBe("Potential security threat detected");
  });
  it("empty checks remain incomplete", () => {
    expect(summarizeBrowserChecks([]).checkedState).toBe("Scan incomplete");
    expect(summarizeBrowserChecks([]).completed).toBe(0);
  });
});