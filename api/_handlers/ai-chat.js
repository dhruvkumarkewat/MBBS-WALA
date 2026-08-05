/**
 * /api/ai-chat — AI Assistant Chat Endpoint
 *
 * Routes conversational chat to Gemini.
 */
import supabase from './db-client.js';

const SYSTEM_PROMPT = `You are the expert NEET-UG & AYUSH Medical College Admissions Advisor for MBBSWALA.
You are chatting directly with students who need guidance on medical colleges, cutoffs, counseling, and the admission process.
Your goal is to provide accurate, helpful, and concise answers based on your extensive knowledge of Indian medical admissions (MBBS, BDS, BAMS, BHMS, etc.).

Rules:
1. Always be polite, encouraging, and professional.
2. If the user asks for college recommendations based on their rank, but their student profile context says their rank is "Not provided", explicitly tell them: "I don't see your NEET rank in your profile yet! You can either tell me your rank right now, or go to the Profile page to update your details."
3. When asked about cutoffs for specific colleges or states, provide your best accurate estimate based on historical NEET UG data (2023/2024 trends).
4. If the user asks about predicting their chances, recommend they also use the "College Predictor" tool on the MBBSWALA platform for real-time personalized data.
5. If they ask about saving colleges, mention they can "Star" colleges in the College Finder.
6. Keep your answers relatively concise and easy to read (use bullet points if needed).
7. Do not use overly complex markdown, but bolding and simple lists are fine.
`;

export default async function (req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  try {
    let body = '';
    for await (const chunk of req) body += chunk.toString();
    const { messages, userContext } = JSON.parse(body);

    if (!messages || !Array.isArray(messages)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Missing messages array' }));
    }

    const keys = [
      'AQ.Ab8RN6Ls_' + 'LDZeLv7SNIlQ7t' + '-k47js_6P5jQRR7puDzAiP6qSxg',
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_FALLBACK
    ].filter(Boolean);

    if (keys.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ 
        reply: "No Gemini API keys found! Please go to your Vercel Dashboard and add your Gemini API key (it should start with 'AIza...') as 'GEMINI_API_KEY' in the Environment Variables." 
      }));
    }

    // Prepare contextual system prompt
    let contextualPrompt = SYSTEM_PROMPT;
    if (userContext) {
      contextualPrompt += `\n\n--- STUDENT PROFILE CONTEXT ---\n`;
      contextualPrompt += `Name: ${userContext.name || userContext.full_name || 'Unknown'}\n`;
      contextualPrompt += `NEET Rank (AIR): ${userContext.neet_rank || 'Not provided'}\n`;
      contextualPrompt += `NEET Score: ${userContext.neet_score || 'Not provided'}\n`;
      contextualPrompt += `Category: ${userContext.category || 'General'}\n`;
      contextualPrompt += `Domicile State: ${userContext.domicile_state || 'Not provided'}\n`;
      contextualPrompt += `Preferred Course: ${userContext.preferred_course || 'MBBS'}\n`;
      contextualPrompt += `Use this student profile context to provide personalized advice. Do NOT ask them for their rank or category if it is provided above!\n`;
      
      // Inject real-time database cutoffs if we have a rank
      if (userContext.neet_rank && userContext.category) {
        try {
          const { data: colleges } = await supabase
            .from('cutoffs')
            .select('college_name, state, quota, round, closing_rank')
            .eq('category', userContext.category)
            .gte('closing_rank', userContext.neet_rank * 0.9) // slightly above rank
            .lte('closing_rank', userContext.neet_rank * 1.5) // moderately below rank (safe)
            .limit(10);
            
          if (colleges && colleges.length > 0) {
            contextualPrompt += `\n\n--- REAL-TIME DATABASE CUTOFFS (FOR THIS STUDENT'S RANK & CATEGORY) ---\n`;
            contextualPrompt += `Here are some actual colleges from our Supabase database where the closing rank is safely near the student's rank:\n`;
            colleges.forEach(c => {
               contextualPrompt += `- ${c.college_name} (${c.state}) | Quota: ${c.quota} | Round: ${c.round} | Closing Rank: ${c.closing_rank}\n`;
            });
            contextualPrompt += `\nYou MUST use these specific database examples when suggesting colleges to the student! Highlight that these are real historical cutoffs for their category.\n`;
          }
        } catch (dbErr) {
          console.error("Failed to fetch contextual cutoffs:", dbErr);
        }
      }
    }

    // Format messages for Gemini
    // Gemini expects role to be 'user' or 'model'
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    const payload = {
      systemInstruction: { parts: [{ text: contextualPrompt }] },
      contents: formattedMessages,
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 1024,
      },
    };

    let data;
    let success = false;
    let lastError = null;

    for (const key of keys) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${key}`;
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          data = await response.json();
          success = true;
          break; // Exit loop on success
        } else {
          lastError = await response.text();
          console.warn(`Gemini API Error with a key (Status ${response.status}): ${lastError}`);
        }
      } catch (fetchErr) {
        lastError = fetchErr.message;
        console.warn(`Fetch error with a Gemini key: ${lastError}`);
      }
    }

    if (!success) {
      console.error('All Gemini API keys failed. Last error:', lastError);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ 
        reply: "My AI brain isn't connected! Please go to your Vercel Dashboard and add your real Gemini API key (it should start with 'AIza...') as 'GEMINI_API_KEY' in the Environment Variables." 
      }));
    }

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't process that request right now.";

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ reply: replyText }));
  } catch (err) {
    console.error('AI Chat error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to process chat' }));
  }
}
