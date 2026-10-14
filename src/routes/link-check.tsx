import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Search, X, XCircle } from "lucide-react";

import { PageShell, cardClass, primaryBtn, secondaryBtn } from "@/components/AppHeader";
import { checkUrl, type UrlCheck } from "@/lib/url-check";

export const Route = createFileRoute("/link-check")({
  validateSearch: (search: Record<string, unknown>): { url?: string } =>
    typeof search.url === "string" ? { url: search.url.slice(0, 2000) } : {},
  head: () => ({
    meta: [
      { title: "Link Checker — Cyber Bro" },
      { name: "description", content: "Check whether a link is a valid web address and spot common warning signs before you open it." },
      { property: "og:title", content: "Link Checker — Cyber Bro" },
      { property: "og:description", content: "Validate a link's format and spot risky patterns, without opening it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LinkPage,
});

function LinkPage() {
  const { url: initial } = Route.useSearch();
  const [input, setInput] = useState(initial ?? "");
  const [result, setResult] = useState<UrlCheck | null>(initial ? checkUrl(initial) : null);

  return (
    <PageShell
      title="Link Checker"
      intro="Paste a link to check its format and look for common tricks. The link is never opened."
    >
      <div className="flex items-start gap-2 rounded-2xl border border-warning/40 bg-warning/15 p-4 text-sm text-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          This tool checks the link's <strong>format and patterns only</strong>. It cannot tell if a website is
          actually malicious — real threat detection needs a link reputation service, which is not connected here.
        </p>
      </div>

      <section className={cardClass}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setResult(checkUrl(input));
          }}
        >
          <label htmlFor="url" className="text-sm font-semibold text-foreground">Link</label>
          <input
            id="url"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={2000}
            placeholder="e.g. https://example.com/login"
            className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button type="submit" disabled={!input.trim()} className={primaryBtn}>
              <Search className="h-4 w-4" /> Check link
            </button>
            <button
              type="button"
              onClick={() => {
                setInput("");
                setResult(null);
              }}
              disabled={!input && !result}
              className={secondaryBtn}
            >
              <X className="h-4 w-4" /> Clear
            </button>
          </div>
        </form>
      </section>

      {!result && (
        <p className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-center text-sm text-muted-foreground">
          Enter a link above and tap "Check link".
        </p>
      )}

      {result && !result.valid && (
        <section role="alert" className="flex items-start gap-3 rounded-2xl border border-danger/40 bg-danger/10 p-5">
          <XCircle className="h-5 w-5 shrink-0 text-danger" />
          <div>
            <p className="font-semibold text-foreground">Not a valid link</p>
            <p className="text-sm text-muted-foreground">{result.error}</p>
          </div>
        </section>
      )}

      {result && result.valid && (
        <section className={`${cardClass} space-y-3`} aria-live="polite">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-safe" />
            <p className="font-semibold text-foreground">Valid web address format</p>
          </div>
          <dl className="grid gap-1 text-sm">
            <div className="flex gap-2"><dt className="text-muted-foreground">Website:</dt><dd className="break-all font-semibold text-foreground">{result.hostname}</dd></div>
            <div className="flex gap-2"><dt className="text-muted-foreground">Full link:</dt><dd className="break-all text-foreground">{result.normalized}</dd></div>
          </dl>
          <ul className="space-y-2">
            {result.notes.map((n) => (
              <li key={n.text} className="flex items-start gap-2 text-sm text-foreground">
                {n.kind === "warn" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-safe" />}
                {n.text}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            A valid format does not mean the site is safe. Only open links from people and companies you trust, and type
            bank addresses yourself.
          </p>
        </section>
      )}
    </PageShell>
  );
}
