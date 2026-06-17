// This runs on Vercel's servers, not in the browser.
// Your Gemini API key lives here as an environment variable and is never exposed to visitors.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "The server is missing its GEMINI_API_KEY. Add it in Vercel project settings." });
  }

  const { action, company, summary, icp, match } = req.body || {};

  let prompt;

  if (action === "find") {
    if (!company || typeof company !== "string" || company.length > 200) {
      return res.status(400).json({ error: "Provide a company name or short description under 200 characters." });
    }
    prompt = `You are a go-to-market analyst. A company gives you only their own name. Do two things they normally do themselves: infer their ideal customer profile (ICP), then find companies that fit it.

The company:
"""${company}"""

Step 1: Infer who this company most likely sells to (industry, size, buyer).
Step 2: List 7 real, well-known companies that fit. Only companies you are reasonably confident exist. Score each 0 to 100 on fit, with a one-line reason. Sort highest first.

Respond with ONLY valid JSON in exactly this shape:
{
  "your_company_summary": "one sentence on what the input company does",
  "inferred_icp": "2 to 3 sentences on their likely ideal customer",
  "matches": [ { "company": "Name", "score": 0, "reason": "one line" } ]
}`;
  } else if (action === "draft") {
    if (!match || !match.company) {
      return res.status(400).json({ error: "Missing the company to draft for." });
    }
    prompt = `Write a short, personalized cold outreach email.

From: ${company} (${summary || ""})
To: a buyer at ${match.company}
Why they're a fit: ${match.reason || ""}
Their likely profile: ${icp || ""}

The email should be specific to ${match.company}, under 110 words, no buzzwords, with one clear ask for a short call. Sound human, not like a template.

Respond with ONLY valid JSON in exactly this shape:
{ "subject": "...", "body": "..." }`;
  } else {
    return res.status(400).json({ error: "Unknown action." });
  }

  try {
    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + key,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
        }),
      }
    );

    const data = await r.json();

    if (!r.ok) {
      return res.status(502).json({ error: (data && data.error && data.error.message) || "Gemini request failed." });
    }

    const text =
      (data && data.candidates && data.candidates[0] &&
        data.candidates[0].content && data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || "";

    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: "Could not process that request. Please try again." });
  }
}

