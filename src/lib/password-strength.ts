// Local-only password strength estimate. Never send, log or store the password.

export type PasswordReport = {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Very weak" | "Weak" | "Fair" | "Strong" | "Very strong";
  entropyBits: number;
  crackTime: string;
  checks: { label: string; ok: boolean }[];
  warnings: string[];
};

const COMMON = new Set([
  "123456", "123456789", "12345678", "12345", "1234567", "1234567890", "111111", "000000",
  "password", "password1", "password123", "qwerty", "qwerty123", "abc123", "iloveyou",
  "admin", "welcome", "letmein", "monkey", "dragon", "india123", "india@123", "sunshine",
  "princess", "football", "cricket", "baseball", "master", "login", "passw0rd", "p@ssw0rd",
  "123123", "654321", "666666", "121212", "1q2w3e4r", "zxcvbnm", "asdfgh", "qwertyuiop",
]);

const SEQUENCES = ["abcdefghijklmnopqrstuvwxyz", "0123456789", "qwertyuiop", "asdfghjkl", "zxcvbnm"];

function hasSequence(pw: string) {
  const lower = pw.toLowerCase();
  for (const seq of SEQUENCES) {
    for (let i = 0; i + 4 <= seq.length; i++) {
      const part = seq.slice(i, i + 4);
      if (lower.includes(part) || lower.includes([...part].reverse().join(""))) return true;
    }
  }
  return false;
}

function formatSeconds(s: number): string {
  if (s < 1) return "instantly";
  const units: [number, string][] = [
    [60 * 60 * 24 * 365 * 100, "centuries"],
    [60 * 60 * 24 * 365, "years"],
    [60 * 60 * 24 * 30, "months"],
    [60 * 60 * 24, "days"],
    [60 * 60, "hours"],
    [60, "minutes"],
    [1, "seconds"],
  ];
  for (const [size, name] of units) {
    if (s >= size) {
      if (name === "centuries") return "centuries";
      return `about ${Math.round(s / size)} ${name}`;
    }
  }
  return "instantly";
}

export function checkPassword(pw: string): PasswordReport {
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);

  let pool = 0;
  if (hasLower) pool += 26;
  if (hasUpper) pool += 26;
  if (hasDigit) pool += 10;
  if (hasSymbol) pool += 33;

  let entropy = pw.length > 0 && pool > 0 ? pw.length * Math.log2(pool) : 0;

  const warnings: string[] = [];
  const isCommon = COMMON.has(pw.toLowerCase());
  if (isCommon) {
    warnings.push("This is one of the most commonly used passwords — attackers try it first.");
    entropy = Math.min(entropy, 10);
  }
  if (/(.)\1{2,}/.test(pw)) {
    warnings.push("It repeats the same character 3 or more times in a row.");
    entropy *= 0.8;
  }
  if (hasSequence(pw)) {
    warnings.push("It contains an easy sequence like 'abcd', '1234' or 'qwer'.");
    entropy *= 0.8;
  }
  if (/^\d+$/.test(pw) && pw.length > 0) {
    warnings.push("It uses only numbers.");
  }
  if (/(19|20)\d{2}/.test(pw)) {
    warnings.push("It looks like it contains a year — years are easy to guess.");
  }

  // Assume an offline attacker making 10 billion guesses per second.
  const seconds = Math.pow(2, entropy) / 2 / 1e10;

  let score: PasswordReport["score"];
  if (pw.length < 8 || isCommon || entropy < 28) score = 0;
  else if (entropy < 40) score = 1;
  else if (entropy < 60) score = 2;
  else if (entropy < 80) score = 3;
  else score = 4;

  const labels = ["Very weak", "Weak", "Fair", "Strong", "Very strong"] as const;

  return {
    score,
    label: labels[score],
    entropyBits: Math.round(entropy),
    crackTime: formatSeconds(seconds),
    checks: [
      { label: "At least 12 characters", ok: pw.length >= 12 },
      { label: "Lowercase letter (a-z)", ok: hasLower },
      { label: "Uppercase letter (A-Z)", ok: hasUpper },
      { label: "Number (0-9)", ok: hasDigit },
      { label: "Symbol (!@#$…)", ok: hasSymbol },
      { label: "Not a common password", ok: !isCommon },
    ],
    warnings,
  };
}

// Strong password suggestions, generated locally with crypto randomness.
// Nothing is derived from the user's own password.

const WORDS = [
  "mango", "river", "tiger", "cloud", "lamp", "monsoon", "cricket", "banyan",
  "sparrow", "marble", "thunder", "coconut", "lantern", "peacock", "bamboo",
  "glacier", "saffron", "violin", "comet", "harbor", "meadow", "falcon",
  "copper", "ember", "willow", "orbit", "pepper", "anchor", "velvet",
];
const SYMBOLS = "!@#$%&*?-_.";
const DIGITS = "0123456789";

function randInt(max: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! % max;
}

function pick<T>(arr: readonly T[]): T {
  return arr[randInt(arr.length)]!;
}

function pickChar(s: string): string {
  return s[randInt(s.length)]!;
}

function capitalize(w: string): string {
  return w.charAt(0).toUpperCase() + w.slice(1);
}

// A random passphrase: 4 words + digits + symbol. Strong and memorable.
function makePassphrase(): string {
  const words = [pick(WORDS), pick(WORDS), pick(WORDS), pick(WORDS)];
  const sep = pick(["-", "-", "_", "."]);
  return `${words.join(sep)}${sep}${pick(DIGITS)}${pick(DIGITS)}${pick(SYMBOLS)}`;
}

// A random 16-character password mixing all character classes.
function makeRandomPassword(): string {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const all = lower + upper + DIGITS + SYMBOLS;
  let pw = pick(lower) + pick(upper) + pick(DIGITS) + pick(SYMBOLS);
  while (pw.length < 16) pw += pick(all);
  return pw
    .split("")
    .sort(() => randInt(3) - 1)
    .join("");
}

export function suggestPasswords(): { label: string; value: string }[] {
  return [
    { label: "Easy to remember", value: makePassphrase() },
    { label: "Easy to remember", value: capitalize(pick(WORDS)) + capitalize(pick(WORDS)) + pick(DIGITS) + pick(DIGITS) + pick(SYMBOLS) },
    { label: "Maximum strength", value: makeRandomPassword() },
  ];
}
