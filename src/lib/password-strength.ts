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
  return `${words.join(sep)}${sep}${pickChar(DIGITS)}${pickChar(DIGITS)}${pickChar(SYMBOLS)}`;
}

// A random 16-character password mixing all character classes.
function makeRandomPassword(): string {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const all = lower + upper + DIGITS + SYMBOLS;
  let pw = pickChar(lower) + pickChar(upper) + pickChar(DIGITS) + pickChar(SYMBOLS);
  while (pw.length < 16) pw += pickChar(all);
  return pw
    .split("")
    .sort(() => randInt(3) - 1)
    .join("");
}

// Strengthens the user's OWN password: keeps their letters and numbers in
// order, mixes upper/lower case, swaps some letters for look-alike symbols,
// breaks easy sequences with symbols and adds random characters until it is
// at least "Strong". Runs locally; nothing is sent anywhere.
const LEET: Record<string, string> = { a: "@", s: "$", o: "0", i: "!", e: "3", l: "1", t: "7" };

type Style = { leet: number; sepEvery: number; minLen: number };

function strengthenOnce(pw: string, style: Style): string {
  const base = pw.replace(/\s+/g, "");
  let out = "";
  let sinceSep = 0;
  for (const ch of base) {
    let c = ch;
    const lower = ch.toLowerCase();
    if (/[a-z]/i.test(ch)) {
      if (LEET[lower] && randInt(100) < style.leet) c = LEET[lower]!;
      else c = randInt(2) === 0 ? ch.toUpperCase() : ch.toLowerCase();
    }
    out += c;
    sinceSep++;
    if (sinceSep >= style.sepEvery) {
      out += pickChar(SYMBOLS);
      sinceSep = 0;
    }
  }
  if (out.length > 0 && SYMBOLS.includes(out[out.length - 1]!)) out = out.slice(0, -1);
  if (!/[A-Z]/.test(out)) out = "ABCDEFGHJKLMNPQRSTUVWXYZ"[randInt(24)] + out;
  if (!/[a-z]/.test(out)) out += pickChar("abcdefghijkmnopqrstuvwxyz");
  if (!/\d/.test(out)) out += pickChar(DIGITS);
  if (!/[^A-Za-z0-9]/.test(out)) out += pickChar(SYMBOLS);
  const all = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ" + DIGITS + SYMBOLS;
  while (out.length < style.minLen) out += pickChar(all);
  return out;
}

export function strengthenPassword(pw: string, style: Style = { leet: 40, sepEvery: 3, minLen: 14 }): string {
  let candidate = strengthenOnce(pw, style);
  for (let i = 0; i < 20 && checkPassword(candidate).score < 3; i++) {
    candidate = strengthenOnce(pw, { ...style, minLen: style.minLen + 2 + i });
  }
  return candidate;
}

export function suggestPasswords(pw = ""): { label: string; value: string }[] {
  if (pw.trim().length > 0) {
    return [
      { label: "Your password, made strong", value: strengthenPassword(pw, { leet: 30, sepEvery: 4, minLen: 14 }) },
      { label: "Your password with symbols mixed in", value: strengthenPassword(pw, { leet: 60, sepEvery: 2, minLen: 14 }) },
      { label: "Your password, extra long", value: strengthenPassword(pw, { leet: 40, sepEvery: 3, minLen: 18 }) },
    ];
  }
  return [
    { label: "Easy to remember", value: makePassphrase() },
    { label: "Maximum strength", value: makeRandomPassword() },
  ];
}
