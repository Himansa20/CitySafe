export async function generateAIInsightClient(prompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing VITE_OPENAI_API_KEY in .env");
  }

  const ctrl = new AbortController();
  const timeout = window.setTimeout(() => ctrl.abort(), 15000);

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt,
        max_output_tokens: 180,
      }),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || `OpenAI HTTP ${res.status}`);
    }

    const data = await res.json();
    return String(data?.output_text ?? "").trim();
  } finally {
    window.clearTimeout(timeout);
  }
}
