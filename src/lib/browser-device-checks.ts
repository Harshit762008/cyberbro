export type CheckStatus = "passed" | "attention" | "unavailable" | "informational";
export type BrowserCheck = {
  id: string;
  title: string;
  status: CheckStatus;
  evidence: string;
  severity: "Medium" | "Low" | "Informational";
  confidence: string;
  recommendation: string;
};

export const BROWSER_CHECKS = [
  { id: "context", title: "Secure browser context" },
  { id: "transport", title: "Page transport" },
  { id: "crypto", title: "Browser cryptography support" },
  { id: "frame", title: "Page embedding" },
  { id: "permissions", title: "This site's permission visibility" },
] as const;

export const UNAVAILABLE_DEVICE_CHECKS = [
  { title: "Malware, files and running processes", permission: "Authorized companion with supported OS scanning access" },
  { title: "Installed apps and sensitive app permissions", permission: "Android companion or Windows agent with explicit permission" },
  { title: "OS updates and built-in antivirus status", permission: "Compatible companion or supported security integration" },
  { title: "Account sessions and exposed credentials", permission: "Separately authorized account security integration" },
] as const;

export type BrowserSnapshot = { secureContext: boolean; protocol: string; localHost: boolean; cryptoAvailable: boolean; embedding: "top-level" | "same-origin" | "cross-origin" };

export function evaluateBrowserCheck(id: string, input: BrowserSnapshot): BrowserCheck {
  const base = { id, title: BROWSER_CHECKS.find((check) => check.id === id)?.title ?? "Browser check", severity: "Informational" as BrowserCheck["severity"], confidence: "Direct browser observation — this page only" };
  if (id === "context") return { ...base, status: input.secureContext ? "passed" : "attention", severity: input.secureContext ? "Informational" : "Medium", evidence: input.secureContext ? "The browser identifies this page as a secure context." : "The browser does not identify this page as a secure context.", recommendation: "Use the official HTTPS website in an up-to-date browser. Secure context does not establish device security." };
  if (id === "transport") return { ...base, status: input.protocol === "https:" ? "passed" : input.localHost ? "informational" : "attention", severity: input.protocol !== "https:" && !input.localHost ? "Medium" : "Informational", evidence: input.protocol === "https:" ? "This page uses HTTPS; certificate reputation and redirects were not checked." : input.localHost ? "This is a local development page, not an HTTPS transport check." : "This page is not loaded over HTTPS.", recommendation: "Do not enter sensitive information on an unencrypted page. HTTPS alone does not establish trustworthiness." };
  if (id === "crypto") return { ...base, status: input.cryptoAvailable ? "passed" : "unavailable", evidence: input.cryptoAvailable ? "The browser successfully generated a temporary random value and exposes Web Crypto." : "Web Crypto could not be confirmed in this browser context.", recommendation: "Use an updated browser with HTTPS. No encryption keys, device files or passwords were inspected." };
  return { ...base, status: "informational", evidence: input.embedding === "top-level" ? "The page is open in its own browser tab." : input.embedding === "same-origin" ? "The page is embedded by a same-origin page." : "The page is embedded by another origin; its parent cannot be inspected here.", recommendation: "For permission prompts, use the official website in its own tab. Embedding is not evidence of compromise." };
}

// Called only after explicit consent, never during module evaluation or SSR.
export async function runBrowserCheck(id: string): Promise<BrowserCheck> {
  if (id === "permissions") {
    const base: BrowserCheck = { id, title: "This site's permission visibility", status: "unavailable", severity: "Informational", confidence: "Browser permission query — this origin only", evidence: "Permission visibility is unavailable. No permission was requested.", recommendation: "Review this site's permissions in browser settings. This does not inspect other apps or websites." };
    if (!navigator.permissions?.query) return base;
    const states: string[] = [];
    for (const name of ["camera", "microphone", "geolocation"] as const) {
      try {
        const permission = await navigator.permissions.query({ name: name as PermissionName });
        states.push(`${name}: ${permission.state}`);
      } catch {
        states.push(`${name}: unavailable`);
      }
    }
    return { ...base, status: states.every((state) => state.endsWith(": unavailable")) ? "unavailable" : "informational", evidence: `${states.join("; ")}. No access was requested or used.` };
  }
  let embedding: BrowserSnapshot["embedding"] = "top-level";
  if (window.self !== window.top) {
    try { embedding = window.top?.location.origin === window.location.origin ? "same-origin" : "cross-origin"; }
    catch { embedding = "cross-origin"; }
  }
  let cryptoAvailable = false;
  try {
    const probe = new Uint8Array(1);
    window.crypto.getRandomValues(probe);
    cryptoAvailable = Boolean(window.crypto.subtle);
    probe.fill(0);
  } catch { /* Report unavailability without logging browser data. */ }
  return evaluateBrowserCheck(id, { secureContext: window.isSecureContext, protocol: window.location.protocol, localHost: ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname), cryptoAvailable, embedding });
}

export function summarizeBrowserChecks(checks: BrowserCheck[]) {
  const threats = checks.filter((check) => check.status === "attention");
  const completed = checks.filter((check) => check.status !== "unavailable").length;
  return {
    state: threats.length ? "Potential security threat detected" as const : "Scan incomplete" as const,
    checkedState: threats.length ? "Potential security threat detected" : completed === BROWSER_CHECKS.length ? "No issues found in checked items" : "Scan incomplete",
    completed,
    unavailable: checks.filter((check) => check.status === "unavailable").length + UNAVAILABLE_DEVICE_CHECKS.length,
  };
}