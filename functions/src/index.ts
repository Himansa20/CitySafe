import * as functions from "firebase-functions";
import cors from "cors";
import OpenAI from "openai";

const corsHandler = cors({ origin: true });

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const aiInsight = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Use POST" });
        return;
      }

      const { prompt } = req.body ?? {};
      if (!prompt || typeof prompt !== "string") {
        res.status(400).json({ error: "Missing prompt" });
        return;
      }

      const response = await client.responses.create({
        model: "gpt-4.1-mini",
        input: prompt,
        max_output_tokens: 180,
      });

      res.json({ text: (response.output_text ?? "").trim() });
    } catch (e: any) {
      console.error("aiInsight error:", e);
      res.status(500).json({ error: e?.message ?? "AI failed" });
    }
  });
});
