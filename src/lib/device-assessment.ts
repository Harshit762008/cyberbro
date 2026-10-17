export type DeviceType = "android" | "windows";
export type Answer = "yes" | "no" | "unknown";
export type Finding = {
  id: string;
  title: string;
  severity: "High" | "Medium" | "Low" | "Informational";
  confidence: string;
  evidence: string;
  explanation: string;
  actions: string[];
};

export const DEVICE_CHECKS = [
  { id: "warning", label: "Does your built-in security app show an active threat warning?", android: "Open Play Store → profile → Play Protect. Run its check and review the result.", windows: "Open Windows Security → Virus & threat protection → Protection history. Review active warnings." },
  { id: "permissions", label: "Does an unfamiliar app have sensitive permissions or device control?", android: "Review Settings → Apps → Special app access and Accessibility. Check SMS, microphone, location, device admin and notification access.", windows: "Review Settings → Privacy & security → App permissions and Settings → Apps → Installed apps. Do not remove unfamiliar system components without checking their publisher." },
  { id: "sessions", label: "Do any account sessions remain unfamiliar after you review the device and location?", android: "Review Google Account → Security → Your devices. Locations can be approximate; confirm the device and activity.", windows: "Review your Microsoft account's sign-in activity, and the security page for your email account." },
  { id: "password", label: "Have you shared a password or OTP, or received confirmation of an unauthorized account change?", android: "Check account security alerts using the official account app or website, not a link in an unexpected message.", windows: "Check account security alerts on the official provider website from a trusted device." },
  { id: "updates", label: "Are operating-system security updates waiting to be installed?", android: "Open Settings → System → Software update and check the Android security update date. Menu names vary by device.", windows: "Open Settings → Windows Update. Check for updates and confirm your Windows version still receives security updates." },
  { id: "protection", label: "Is built-in security protection disabled or failing to run?", android: "Review Play Protect settings and confirm app scanning is enabled.", windows: "Review Windows Security → Virus & threat protection settings. If a trusted third-party security app manages protection, verify its status first." },
  { id: "symptoms", label: "Have you noticed battery drain, overheating or slow performance?", android: "Review battery usage and storage. These symptoms have many non-security causes.", windows: "Review battery usage, storage and performance. These symptoms alone do not establish a security threat." },
] as const;

export type CheckId = (typeof DEVICE_CHECKS)[number]["id"];
export type Observations = Partial<Record<CheckId, { answer: Answer; detail: string }>>;
export type DeviceReport = {
  state: "Scan incomplete" | "No issues detected in checked items" | "Potential threat found";
  checked: number;
  total: number;
  findings: Finding[];
  limitations: string;
  nextSteps: string[];
};

const RULES: Record<CheckId, Omit<Finding, "id" | "evidence">> = {
  warning: { title: "Reported security warning", severity: "High", confidence: "Unverified user report", explanation: "An active security warning deserves prompt review. This website has not read or validated the warning.", actions: ["Open your built-in security app directly and follow its documented remediation.", "Avoid logging into sensitive accounts on this device until the warning is resolved.", "If it remains unresolved, contact the device vendor or a trusted technician."] },
  permissions: { title: "Unfamiliar app with sensitive access", severity: "Medium", confidence: "Limited — app identity not verified", explanation: "Sensitive access can be legitimate. An unfamiliar app needs a publisher and purpose check before calling it malicious.", actions: ["Record the app name, publisher and permissions in device settings.", "Revoke permissions you do not need. Verify system components before removing anything.", "Remove an app only after confirming it is unwanted or suspicious, then run the built-in security check."] },
  sessions: { title: "Unfamiliar account session reported", severity: "High", confidence: "Unverified user report", explanation: "An unrecognized session may indicate account compromise, but VPNs and approximate locations can also explain it.", actions: ["On a trusted device, review the session's device, time and activity.", "Sign out sessions you confirm are not yours using the official account security page.", "Change the account password on a trusted device and enable two-factor authentication."] },
  password: { title: "Possible exposed account credentials", severity: "High", confidence: "Unverified user report", explanation: "Sharing a password or OTP can enable account takeover. An unauthorized change should be investigated urgently.", actions: ["Change the affected password from a trusted device; use a unique password.", "Review recovery email, phone number, connected apps and recent account activity.", "Revoke unknown sessions and enable two-factor authentication. Use the provider's official recovery flow if locked out.", "If money was taken, contact your bank promptly; in India, call 1930 and report at cybercrime.gov.in."] },
  updates: { title: "Security updates pending", severity: "Low", confidence: "Unverified user report", explanation: "Missing updates increase exposure to known vulnerabilities; they do not prove infection.", actions: ["Install available security updates from official device settings.", "Restart when requested and confirm the device is on a supported operating-system version."] },
  protection: { title: "Security protection needs attention", severity: "Medium", confidence: "Unverified user report", explanation: "Disabled protection reduces coverage. Another legitimate security app or a managed-device policy may explain the setting.", actions: ["Verify whether a trusted security app or your organization manages protection.", "Re-enable built-in protection if appropriate, update its definitions and run its supported scan."] },
  symptoms: { title: "Performance symptoms only", severity: "Informational", confidence: "Insufficient evidence of compromise", explanation: "Battery drain, heat and slow performance alone cannot establish that a device is hacked.", actions: ["Review battery usage, free storage, updates and recently changed apps.", "If symptoms persist, seek device support. Do not factory-reset based on these symptoms alone."] },
};

export function assessDevice(observations: Observations): DeviceReport {
  const checked = DEVICE_CHECKS.filter(({ id }) => {
    const answer = observations[id]?.answer;
    return answer === "yes" || answer === "no";
  }).length;
  const findings = DEVICE_CHECKS.flatMap(({ id, label }) => {
    const observation = observations[id];
    if (observation?.answer !== "yes") return [];
    const rule = RULES[id];
    const detail = observation.detail.trim().slice(0, 500);
    return [{ ...rule, id, evidence: detail ? `You reported: ${detail}` : `You answered Yes: ${label}` }];
  });
  const hasConcern = findings.some((finding) => finding.severity !== "Informational");
  return {
    state: hasConcern ? "Potential threat found" : checked < DEVICE_CHECKS.length ? "Scan incomplete" : "No issues detected in checked items",
    checked,
    total: DEVICE_CHECKS.length,
    findings,
    limitations: "Guided assessment only, based on your answers. No files, processes, installed apps or operating-system internals were accessed. Findings are not independently verified. A clean result does not prove this device is malware-free.",
    nextSteps: checked < DEVICE_CHECKS.length
      ? ["Review unanswered or uncertain items in device settings; unknown items remain unchecked.", "Run your device's built-in security check and return with its actual findings."]
      : ["Keep your operating system and apps updated.", "Use unique passwords and two-factor authentication; review account sessions regularly."],
  };
}