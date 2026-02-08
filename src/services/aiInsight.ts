export async function generateAIInsight(prompt: string): Promise<string> {
  const url = import.meta.env.VITE_AI_INSIGHT_URL;
  if (!url) throw new Error("Missing VITE_AI_INSIGHT_URL in web/.env");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return String(data?.text ?? "").trim();
}
