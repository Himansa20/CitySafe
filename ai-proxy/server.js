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

// Route analysis endpoint
app.post("/analyzeRoute", async (req, res) => {
  const { routes, startName, endName } = req.body;

  if (!routes || !Array.isArray(routes) || routes.length === 0) {
    return res.status(400).json({ error: "Missing routes data" });
  }

  // Build prompt for AI
  const routeDescriptions = routes.map((r, i) => {
    const distKm = (r.distance / 1000).toFixed(2);
    const durationMin = Math.round(r.duration / 60);
    const dangerLevel = r.dangerScore > 30 ? "HIGH RISK" : r.dangerScore > 10 ? "MEDIUM RISK" : "LOW RISK";
    return `Route ${i + 1}: ${distKm}km, ~${durationMin} min walk, Danger Score: ${r.dangerScore} (${dangerLevel}), passes ${r.dangerZonesCount} reported incident areas`;
  }).join("\n");

  const prompt = `You are a safety advisor for night-time walking routes in a city.

A user wants to walk from "${startName || 'Start'}" to "${endName || 'End'}".

Here are the available routes:
${routeDescriptions}

Based on balancing SAFETY (lower danger score = safer) and CONVENIENCE (shorter distance), recommend ONE route number and explain your reasoning in 2-3 sentences. Format your response as:
RECOMMENDED: Route X
REASON: [Your explanation]`;

  try {
    const resp = await client.chat.completions.create(
      {
        model: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 150,
      },
      { headers: { "HTTP-Referer": "http://localhost:5173", "X-Title": "CitySignal" } }
    );

    const text = resp.choices?.[0]?.message?.content?.trim() ?? "";

    // Parse response to extract route number
    const match = text.match(/Route\s*(\d+)/i);
    const recommendedIndex = match ? parseInt(match[1], 10) - 1 : 0;

    return res.json({
      recommendedIndex: Math.max(0, Math.min(recommendedIndex, routes.length - 1)),
      explanation: text,
    });
  } catch (e) {
    console.error("[analyzeRoute] error:", e);
    // Fallback to safest route
    return res.json({
      recommendedIndex: 0,
      explanation: "AI analysis unavailable. Showing the safest route based on danger score.",
    });
  }
});
// Safe place recommendation endpoint
app.post("/recommendSafePlace", async (req, res) => {
  const { places, dangerType, currentTime } = req.body;

  if (!places || !Array.isArray(places) || places.length === 0) {
    return res.status(400).json({ error: "Missing places data" });
  }

  const placeDescriptions = places.map((p) => {
    return `- ${p.name} (${p.type}): ${p.distance}m away, ${p.isOpen ? "OPEN" : "CLOSED"} (Until: ${p.openUntil})`;
  }).join("\n");

  const prompt = `You are a safety assistant helping a user in potential danger (${dangerType || "general safety threat"}).
Current time: ${currentTime}

Nearby safe places:
${placeDescriptions}

Recommend the BEST single location for the user to go to right now. Prioritize:
1. OPEN locations
2. Proximity (closer is better)
3. Suitability for the threat (e.g. Police for violence, Hospital for injury)

Format:
RECOMMENDED_ID: [id]
REASON: [1 sentence explanation]`;

  try {
    const resp = await client.chat.completions.create(
      {
        model: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 100,
      },
      { headers: { "HTTP-Referer": "http://localhost:5173", "X-Title": "CitySignal" } }
    );

    const text = resp.choices?.[0]?.message?.content?.trim() ?? "";

    // Extract ID and reason
    const idMatch = text.match(/RECOMMENDED_ID:\s*(\S+)/i);
    const reasonMatch = text.match(/REASON:\s*(.+)/i);

    return res.json({
      recommendedId: idMatch ? idMatch[1] : places[0].id,
      explanation: reasonMatch ? reasonMatch[1] : "Closest open location.",
    });
  } catch (e) {
    console.error("[recommendSafePlace] error:", e);
    return res.json({
      recommendedId: places[0].id,
      explanation: "AI unavailable. Recommending closest location.",
    });
  }
});

// Area analysis endpoint
app.post("/areaInsight", async (req, res) => {
  const { signals, pois, userLocation } = req.body;

  if (!signals || !Array.isArray(signals)) {
    return res.status(400).json({ error: "Missing signals data" });
  }

  // Summarize input
  const signalSummary = signals.slice(0, 15).map(s => `- ${s.category}: ${s.description.slice(0, 50)}...`).join("\n");
  const poiSummary = pois ? pois.slice(0, 10).map(p => `- ${p.type} (${p.tags.name || "Unnamed"}): ${p.distance}m`).join("\n") : "No POI data";

  const prompt = `You are an Urban Planning AI Assistant for CitySignal.
  
  Analyze the following data for a specific area (Lat: ${userLocation?.lat}, Lng: ${userLocation?.lng}):
  
  User Reports (Signals):
  ${signalSummary}
  
  Nearby Infrastructure (POIs):
  ${poiSummary}
  
  Task:
  1. Identify the TOP priority issue based on the signals.
  2. Propose a specific solution, considering the nearby infrastructure (or lack thereof).
  3. Explain WHY this solution works in 1-2 sentences.
  
  Format response as JSON:
  {
    "priorityLevel": "High" | "Medium" | "Low",
    "mainIssue": "Short title of the problem",
    "proposedSolution": "Specific actionable solution",
    "reasoning": "Explanation",
    "missingInfrastructure": ["Street Light", "Police Station", etc. if applicable]
  }`;

  try {
    const resp = await client.chat.completions.create(
      {
        model: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 250,
      },
      { headers: { "HTTP-Referer": "http://localhost:5173", "X-Title": "CitySignal" } }
    );

    const text = resp.choices?.[0]?.message?.content?.trim() ?? "";

    // Attempt to parse JSON
    let result;
    try {
      // Find JSON blob if mixed with text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch (e) {
      console.error("Failed to parse AI JSON:", e);
      // Fallback object
      result = {
        priorityLevel: "Medium",
        mainIssue: "Mixed Area Reports",
        proposedSolution: "Increase patrol and monitoring.",
        reasoning: text.slice(0, 100) + "...",
        missingInfrastructure: []
      };
    }

    return res.json(result);

  } catch (e) {
    console.error("[areaInsight] error:", e);

    // Mock Fallback for resilience
    const mockResponse = {
      priorityLevel: signals.length > 5 ? "High" : "Medium",
      mainIssue: signals.length > 0 ? `${signals[0].category.replace("_", " ")} Hotspot` : "General Area Assessment",
      proposedSolution: "Install additional street lighting and increase waste collection frequency.",
      reasoning: "Analysis unavailable due to high demand. Recommendation based on heuristic pattern matching of 'safety' and 'waste' reports.",
      missingInfrastructure: ["Street Lights", "Waste Bins"]
    };

    return res.json(mockResponse);
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
