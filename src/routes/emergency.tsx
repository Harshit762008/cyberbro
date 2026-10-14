import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, PhoneCall, ShieldAlert } from "lucide-react";

import { PageShell, cardClass, secondaryBtn } from "@/components/AppHeader";
import { EMERGENCY_NUMBER } from "@/lib/analyze-message";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      { title: "Emergency Support — Cyber Bro" },
      { name: "description", content: "Get help fast if you have been scammed: call support, the 1930 cyber crime helpline, or report online." },
      { property: "og:title", content: "Emergency Support — Cyber Bro" },
      { property: "og:description", content: "Quick steps and contacts if you think you've been scammed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EmergencyPage,
});

function EmergencyPage() {
  return (
    <PageShell title="Emergency Support" intro="If you think you've been scammed or shared your details, act quickly.">
      <section className="rounded-2xl border border-danger/40 bg-danger/10 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-danger text-danger-foreground">
            <PhoneCall className="h-6 w-6" />
          </span>
          <div className="flex-1 space-y-3">
            <div>
              <p className="font-semibold text-foreground">Talk to someone now</p>
              <p className="text-xs text-muted-foreground">Calling opens your phone's dialer.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <a href={`tel:${EMERGENCY_NUMBER}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-danger px-5 py-3 text-sm font-semibold text-danger-foreground transition-opacity hover:opacity-90">
                <PhoneCall className="h-4 w-4" /> Call support: {EMERGENCY_NUMBER}
              </a>
              <a href="tel:1930" className={secondaryBtn}>
                <PhoneCall className="h-4 w-4" /> Cyber crime helpline: 1930
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className={cardClass}>
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <ShieldAlert className="h-5 w-5 text-primary" /> What to do right away
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-foreground">
          <li>If money was taken, call 1930 immediately — the sooner, the better the chance to stop it.</li>
          <li>Call your bank on the number printed on your card and block your card / UPI.</li>
          <li>Change passwords for email, banking and social media accounts.</li>
          <li>Keep screenshots of messages, numbers and transaction IDs as proof.</li>
          <li>File a complaint online at the National Cyber Crime Reporting Portal.</li>
        </ol>
        <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer" className={`${secondaryBtn} mt-4`}>
          <ExternalLink className="h-4 w-4" /> Report at cybercrime.gov.in
        </a>
      </section>
    </PageShell>
  );
}
