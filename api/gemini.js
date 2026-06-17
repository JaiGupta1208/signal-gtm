// api/gemini.js — runs on Vercel's servers, never in the browser.
// GEMINI_API_KEY lives as a Vercel environment variable.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not set in Vercel environment variables." });
  }

  const { action, company, summary, icp, match, contact } = req.body || {};

  let prompt;

  if (action === "find") {
    if (!company || typeof company !== "string" || company.length > 200) {
      return res.status(400).json({ error: "Provide a company name or short description under 200 characters." });
    }
    prompt = `You are a go-to-market analyst. A company gives you only their own name. Do two things: infer their ideal customer profile (ICP), then find companies that fit it.

The company:
"""${company}"""

Step 1: Infer who this company most likely sells to (industry, size, buyer persona — include 3-5 typical job titles of the buyer).
Step 2: List 7 real, well-known companies that fit. Only companies you are reasonably confident exist. Score each 0-100 on fit, one-line reason. Sort highest first.

Respond with ONLY valid JSON in exactly this shape:
{
  "your_company_summary": "one sentence on what the input company does",
  "inferred_icp": "2-3 sentences on their likely ideal customer",
  "icp_title_keywords": ["VP Marketing", "Head of Growth", "CMO"],
  "matches": [ { "company": "Name", "score": 0, "reason": "one line" } ]
}`;
  } else if (action === "draft") {
    if (!match || !match.company) {
      return res.status(400).json({ error: "Missing the company to draft for." });
    }
    // Use real contact info if available, otherwise write generically
    const toLine = contact && contact.name
      ? `${contact.name}${contact.title ? ", " + contact.title : ""} at ${match.company}`
      : `a senior buyer at ${match.company}`;

    prompt = `Write a short, personalized cold outreach email.

From: ${company} (${summary || ""})
To: ${toLine}
Why they're a fit: ${match.reason || ""}
Their likely ICP profile: ${icp || ""}

Rules:
- Address ${contact && contact.name ? contact.name.split(" ")[0] : "them"} by first name if known
- Under 110 words, zero buzzwords
- One specific insight about ${match.company} that shows you did your homework
- One clear ask for a 15-minute call
- Sound like a smart human, not a template

Respond with ONLY valid JSON:
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
      (data?.candidates?.[0]?.content?.parts?.[0]?.text) || "";

    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: "Could not process that request. Please try again." });
  }
}
