/**
 * /api/ai-chat — AI Assistant Chat Endpoint
 *
 * Routes conversational chat to Gemini.
 */

const SYSTEM_PROMPT = `You are the expert NEET-UG & AYUSH Medical College Admissions Advisor for MBBSWALA.
You are chatting directly with students who need guidance on medical colleges, cutoffs, counseling, and the admission process.
Your goal is to provide accurate, helpful, and concise answers based on your extensive knowledge of Indian medical admissions (MBBS, BDS, BAMS, BHMS, etc.).

Rules:
1. Always be polite, encouraging, and professional.
2. When asked about cutoffs for specific colleges or states, provide your best accurate estimate based on historical NEET UG data (2023/2024 trends).
3. If the user asks about predicting their chances, recommend they also use the "College Predictor" tool on the MBBSWALA platform for real-time personalized data.
4. If they ask about saving colleges, mention they can "Star" colleges in the College Finder.
5. Keep your answers relatively concise and easy to read (use bullet points if needed).
6. Do not use overly complex markdown, but bolding and simple lists are fine.
`;

export default async function (req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  try {
    let body = '';
    for await (const chunk of req) body += chunk.toString();
    const { messages } = JSON.parse(body);

    if (!messages || !Array.isArray(messages)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Missing messages array' }));
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('Missing GEMINI_API_KEY environment variable');
    }

    // Format messages for Gemini
    // Gemini expects role to be 'user' or 'model'
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    const payload = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: formattedMessages,
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 1024,
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error:', errText);
      throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't process that request right now.";

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ reply: replyText }));
  } catch (err) {
    console.error('AI Chat error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to process chat' }));
  }
}
