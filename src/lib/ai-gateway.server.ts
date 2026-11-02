// Server-only: streamed JSON call to the Lovable AI Gateway (Gemini, zero-retention chat endpoint).
export const GEMINI_MODEL = "google/gemini-3.8-flash";

export class GatewayError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function gatewayJson<T>(messages: unknown[], schemaName: string, schema: object): Promise<T> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new GatewayError(401, "AI service is not configured.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      stream: true,
      messages,
      response_format: { type: "json_schema", json_schema: { name: schemaName, strict: true, schema } },
    }),
  });
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    let msg = "";
    try { msg = JSON.parse(body)?.error?.message ?? JSON.parse(body)?.message ?? ""; } catch { /* ignore */ }
    const friendly: Record<number, string> = {
      402: "AI credits are used up for this workspace. Add credits to continue.",
      429: "Too many requests right now. Please wait a minute and try again.",
      403: "The AI service declined this request.",
      400: "This file or text could not be processed by the AI.",
    };
    throw new GatewayError(res.status, friendly[res.status] ?? (msg || "The AI service is temporarily unavailable."));
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "", text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const data = t.slice(5).trim();
      if (data === "[DONE]") continue;
      try { text += JSON.parse(data)?.choices?.[0]?.delta?.content ?? ""; } catch { /* partial */ }
    }
  }
  if (!text.trim()) throw new GatewayError(502, "The AI returned no answer. Please try again.");
  try { return JSON.parse(text) as T; } catch { throw new GatewayError(502, "The AI answer could not be read. Please try again."); }
}
