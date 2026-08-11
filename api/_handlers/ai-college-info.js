import { callAI } from './ai-service.js';

const SYSTEM_PROMPT = `You are MBBSWALA NEET Expert College Advisor. The user wants detailed information about a specific medical college in India.
Provide a comprehensive overview of the requested medical college.
Return ONLY valid JSON exactly matching this structure (be concise but highly informative):
{
  "name": "Full name of the college",
  "location": "City, State (CRITICAL: Be extremely accurate. If there are multiple branches, use the exact one mentioned. E.g., 'LNCT Medical College Indore' vs 'Bhopal')",
  "established": "Year of establishment",
  "affiliated_university": "Name of affiliated university",
  "type": "Government / Private / Deemed",
  "official_website": "The real official website URL (e.g. 'https://aiims.edu'). If you are NOT 100% sure, leave this as null. DO NOT hallucinate fake domains like '.ac.in' if they don't exist.",
  "hospital_beds": "Approximate number of hospital beds",
  "total_mbbs_seats": "Number of MBBS seats",
  "about": "A 2-3 paragraph detailed summary of the college's reputation, campus life, academics, and patient flow.",
  "estimated_fees": "Approximate total fees for the course",
  "ranking_and_reputation": "Any known NIRF ranking or general reputation in the state/country.",
  "facilities": ["List of 4-6 key facilities e.g. Library, Hostels, Sports, Auditorium"]
}
Rules:
1. ONLY return JSON. Do not include markdown code blocks.
2. DO NOT hallucinate data. If you don't know the exact official website, set "official_website": null.
3. Pay close attention to the city or state if it is included in the college name, to avoid confusing it with another branch of the same group.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  try {
    const { college_name } = req.body;

    if (!college_name) {
      return res.status(400).json({ error: 'college_name is required' });
    }

    const aiPayload = {
      system_prompt: SYSTEM_PROMPT,
      user_prompt: { college_name }
    };

    const aiResponse = await callAI(aiPayload);
    
    return res.status(200).json(aiResponse);

  } catch (err) {
    console.error('[AI-College-Info] Handler error:', err);
    return res.status(500).json({
      error: 'College info service error',
      details: err.message || 'Internal error',
    });
  }
}
