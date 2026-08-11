import { callAI } from './ai-service.js';
import supabase from './db-client.js';

const SYSTEM_PROMPT = `You are MBBSWALA NEET Expert Admission Advisor. The user is looking at the Seat Matrix for a specific medical college.
Analyze the provided seat matrix data for this college.
Return ONLY valid JSON exactly matching this structure (be concise but highly informative, do not hallucinate fees or unrelated info):
{
  "college_name": "Full name of the college",
  "ai_verdict": "A 1-2 sentence AI verdict/summary of this college's seat matrix (e.g. 'This college has a high number of All India seats, making it a great option for out-of-state students.')",
  "seat_breakdown_summary": "A 1 sentence summary of the major quotas available.",
  "key_insights": [
    "Insight 1 (e.g. It has 15% NRI quota seats)",
    "Insight 2 (e.g. Significant seats reserved for State Quota)"
  ],
  "recommendation": "Who should target this college based on the seat matrix?"
}
Rules:
1. ONLY return JSON. Do not include markdown code blocks.
2. Rely ONLY on the seat data provided. Do not hallucinate data.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  try {
    const { college_name } = req.body;

    if (!college_name) {
      return res.status(400).json({ error: 'college_name is required' });
    }

    // 1. Fetch exact seat matrix from DB for context to avoid hallucination
    const { data: seatMatrixRows } = await supabase
      .from('seat_matrix')
      .select('*')
      .ilike('college_name', `%${college_name}%`)
      .limit(20);

    const seatDataForContext = (seatMatrixRows || []).map(r => ({
      course: r.course_name,
      category: r.category,
      quota: r.quota_code,
      total_seats: r.total_seats,
      open_seats: r.open_seats
    }));

    const aiPayload = {
      system_prompt: SYSTEM_PROMPT,
      user_prompt: {
        college_name,
        available_seat_matrix_data: seatDataForContext
      }
    };

    const aiResponse = await callAI(aiPayload);
    
    // Add raw data summary for UI usage if needed
    aiResponse._raw_data_count = seatDataForContext.length;
    
    return res.status(200).json(aiResponse);

  } catch (err) {
    console.error('[AI-Seat-Matrix-Info] Handler error:', err);
    return res.status(500).json({
      error: 'AI Seat Matrix service error',
      details: err.message || 'Internal error',
    });
  }
}
