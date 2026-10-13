// URL syntax + simple pattern check. This is NOT a threat/reputation scan.

export type UrlCheck =
  | { valid: false; error: string }
  | {
      valid: true;
      normalized: string;
      protocol: string;
      hostname: string;
      notes: { kind: "warn" | "ok"; text: string }[];
    };

const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "cutt.ly", "rb.gy", "ow.ly", "shorturl.at", "tiny.cc"];

export function checkUrl(input: string): UrlCheck {
  const raw = input.trim();
  if (!raw) return { valid: false, error: "Please enter a link to check." };
  if (/\s/.test(raw)) return { valid: false, error: "A link cannot contain spaces." };

  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { valid: false, error: "This is not a valid web address." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { valid: false, error: `Only web links (http/https) can be checked — this one uses "${url.protocol}".` };
  }
  const host = url.hostname.toLowerCase();
  if (!host.includes(".") && host !== "localhost") {
    return { valid: false, error: "The address is missing a proper domain (like example.com)." };
  }

  const notes: { kind: "warn" | "ok"; text: string }[] = [];
  if (url.protocol === "http:") notes.push({ kind: "warn", text: "Uses http, not https — the connection is not encrypted." });
  else notes.push({ kind: "ok", text: "Uses https (encrypted connection). Note: scam sites can use https too." });

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith("["))
    notes.push({ kind: "warn", text: "Uses a raw IP address instead of a name — real companies rarely do this." });
  if (host.split(".").some((p) => p.startsWith("xn--")))
    notes.push({ kind: "warn", text: "Contains look-alike (international) characters that can imitate a real brand name." });
  if (url.username || url.password || raw.includes("@"))
    notes.push({ kind: "warn", text: "Contains an '@' sign — this trick can hide the real website address." });
  if (SHORTENERS.includes(host))
    notes.push({ kind: "warn", text: "This is a link shortener — the real destination is hidden." });
  if (host.split(".").length > 4)
    notes.push({ kind: "warn", text: "Has many sub-parts in the name — scammers use this to look like a real site." });
  if (raw.length > 120) notes.push({ kind: "warn", text: "The link is unusually long." });

  return { valid: true, normalized: url.href, protocol: url.protocol.replace(":", ""), hostname: host, notes };
}

export function looksLikeUrl(text: string) {
  return /^(https?:\/\/|www\.)\S+$/i.test(text.trim());
}
