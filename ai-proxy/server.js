import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: mustEnv("OPENROUTER_API_KEY"),
});
console.log("OpenAI Client BaseURL:", client.baseURL);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/aiInsight", async (req, res) => {
  const prompt = req.body?.prompt;
  console.log("[aiInsight] request bytes:", JSON.stringify(req.body || {}).length);

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing prompt" });
  }

  // OpenRouter attribution headers are optional, but fine to include. :contentReference[oaicite:0]{index=0}
  const extraHeaders = {
    "HTTP-Referer": "http://localhost:5173",
    "X-Title": "CitySignal",
  };

  try {
    const resp = await client.chat.completions.create(
      {
        model: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 220,
      },
      { headers: extraHeaders }
    );

    const choice = resp.choices?.[0];
    const text = choice?.message?.content?.trim() ?? "";

    console.log("[aiInsight] model:", resp.model);
    console.log("[aiInsight] finish_reason:", choice?.finish_reason);
    console.log("[aiInsight] usage:", resp.usage);
    console.log("[aiInsight] text_len:", text.length);

    if (!text) {
      // Fail loudly so the UI shows a real error, not "No insight returned"
      return res.status(502).json({
        error: "Model returned empty output",
        debug: {
          finish_reason: choice?.finish_reason ?? null,
          has_message: !!choice?.message,
          raw_message: choice?.message ?? null,
        },
      });
    }

    return res.json({ text });
  } catch (e) {
    console.error("[aiInsight] error:", e);

    // Some SDK errors contain response info; keep it simple for now
    return res.status(500).json({
      error: e?.message ?? "AI failed",
    });
  }
});

const port = Number(process.env.PORT || 8787);
const server = app.listen(port, () => {
  console.log(`AI proxy running on http://localhost:${port}`);
});

server.on("error", (err) => {
  console.error("Server error:", err.message);
  process.exit(1);
});
