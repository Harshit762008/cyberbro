import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, Eye, EyeOff, Lock, X, XCircle, AlertTriangle } from "lucide-react";

import { PageShell, cardClass, secondaryBtn } from "@/components/AppHeader";
import { checkPassword } from "@/lib/password-strength";

export const Route = createFileRoute("/password-check")({
  head: () => ({
    meta: [
      { title: "Password Checker — Cyber Bro" },
      { name: "description", content: "Check how strong your password is. Runs only in your browser — nothing is uploaded or stored." },
      { property: "og:title", content: "Password Checker — Cyber Bro" },
      { property: "og:description", content: "Private, in-browser password strength checker with simple tips." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PasswordPage,
});

const BAR = ["bg-danger", "bg-danger", "bg-warning", "bg-safe", "bg-safe"];

function PasswordPage() {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const report = useMemo(() => (pw ? checkPassword(pw) : null), [pw]);

  return (
    <PageShell
      title="Password Checker"
      intro="Type a password to see how strong it is. The check happens only in your browser — your password is never sent, saved or logged."
    >
      <section className={cardClass}>
        <label htmlFor="pw" className="text-sm font-semibold text-foreground">
          Password
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="pw"
            type={show ? "text" : "password"}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            maxLength={128}
            placeholder="Type a password to test"
            className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button type="button" onClick={() => setShow((s) => !s)} className={secondaryBtn} aria-label={show ? "Hide password" : "Show password"}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="hidden sm:inline">{show ? "Hide" : "Show"}</span>
          </button>
          <button type="button" onClick={() => setPw("")} disabled={!pw} className={secondaryBtn} aria-label="Clear password">
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" /> Private: stays on this device only.
        </p>
      </section>

      {!report ? (
        <p className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-center text-sm text-muted-foreground">
          Start typing above to see the strength of your password.
        </p>
      ) : (
        <section className={`${cardClass} space-y-4`} aria-live="polite">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold text-foreground" data-testid="pw-label">{report.label}</p>
            <p className="text-xs text-muted-foreground">Estimated time to crack: <span className="font-semibold text-foreground">{report.crackTime}</span></p>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className={`h-2.5 rounded-full ${i <= report.score ? BAR[report.score] : "bg-muted"}`} />
            ))}
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {report.checks.map((c) => (
              <li key={c.label} className="flex items-center gap-2 text-sm text-foreground">
                {c.ok ? <CheckCircle2 className="h-4 w-4 text-safe" /> : <XCircle className="h-4 w-4 text-danger" />}
                {c.label}
              </li>
            ))}
          </ul>
          {report.warnings.length > 0 && (
            <ul className="space-y-1.5 rounded-xl bg-warning/15 p-3">
              {report.warnings.map((w) => (
                <li key={w} className="flex items-start gap-2 text-sm text-foreground">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  {w}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            Tip: a long phrase of 4+ random words (like "mango-river-blue-lamp") is strong and easy to remember. Use a different password for every account.
          </p>
        </section>
      )}
    </PageShell>
  );
}
