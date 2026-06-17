// api/apollo.js — Vercel serverless function
// Proxies Apollo.io People Search so the API key stays server-side.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.APOLLO_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "APOLLO_API_KEY is not set in Vercel environment variables." });
  }

  const { company_name, icp_title_keywords } = req.body || {};
  if (!company_name) {
    return res.status(400).json({ error: "company_name is required." });
  }

  const titles = icp_title_keywords && icp_title_keywords.length
    ? icp_title_keywords
    : ["VP Marketing", "Head of Growth", "CMO", "VP Sales", "Director of Marketing", "Chief Marketing Officer"];

  try {
    const body = {
      q_organization_name: company_name,
      person_titles: titles,
      per_page: 1,
      page: 1,
    };

    const r = await fetch("https://api.apollo.io/v1/mixed_people/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": key,
      },
      body: JSON.stringify(body),
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(502).json({ error: (data && data.message) || "Apollo request failed." });
    }

    const people = (data && data.people) || [];
    if (!people.length) {
      const r2 = await fetch("https://api.apollo.io/v1/mixed_people/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "X-Api-Key": key,
        },
        body: JSON.stringify({
          q_organization_name: company_name,
          person_seniorities: ["vp", "director", "c_suite", "head"],
          per_page: 1,
          page: 1,
        }),
      });
      const data2 = await r2.json();
      const people2 = (data2 && data2.people) || [];
      if (!people2.length) {
        return res.status(200).json({ contact: null });
      }
      return res.status(200).json({ contact: formatContact(people2[0]) });
    }

    return res.status(200).json({ contact: formatContact(people[0]) });
  } catch (err) {
    return res.status(500).json({ error: "Could not reach Apollo. Please try again." });
  }
}

function formatContact(person) {
  const email =
    (person.email && !person.email.includes("@noemail") ? person.email : null) ||
    (person.contact && person.contact.email) ||
    null;

  return {
    name: [person.first_name, person.last_name].filter(Boolean).join(" ") || null,
    title: person.title || null,
    email: email,
    linkedin: person.linkedin_url || null,
    company: (person.organization && person.organization.name) || null,
  };
}
