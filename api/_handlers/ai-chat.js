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

function getProviderOrder() {
  const envOrder = process.env.AI_PROVIDER_ORDER;
  if (envOrder) {
    return envOrder.split(',').map((s) => s.trim().toLowerCase());
  }
  return ['gemini', 'gemini_1', 'gemini_2', 'gemini_3', 'gemini_4', 'gemini_5', 'gemini_6', 'gemini_7', 'gemini_8', 'gemini_9', 'gemini_10', 'gemini_11', 'gemini_12', 'gemini_13', 'gemini_14', 'gemini_15', 'groq'];
}

export default async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, userContext } = req.body || {};

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing messages array' });
    }

    const contextualPrompt = `
${SYSTEM_PROMPT}

Student Profile (Current Context):
- Domicile: ${userContext?.domicile_state || 'Not provided'}
- Target State: ${userContext?.target_state || 'Not provided'}
- Category: ${userContext?.category || 'Not provided'}
- NEET Rank: ${userContext?.rank ? `AIR ${userContext.rank}` : 'Not provided'}
- Score: ${userContext?.score || 'Not provided'}
- Quotas: ${userContext?.quotas?.join(', ') || 'Not provided'}
`;

    const order = getProviderOrder();

    let replyText = null;
    let success = false;
    let lastError = null;

    for (const providerKey of order) {
      try {
        const isGroq = providerKey === 'groq';
        const isGemini = providerKey.startsWith('gemini');

        let key;
        if (isGroq) {
          key = process.env.GROQ_API_KEY || process.env.GROQ_PREDICT_API_KEY;
        } else if (providerKey === 'gemini') {
          key = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_FALLBACK;
        } else {
          const idx = providerKey.split('_')[1];
          key = process.env[`GEMINI_API_KEY_${idx}`];
        }

        if (!key) continue;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), isGroq ? 60000 : 120000);

        if (isGemini) {
          // Format for Gemini
          const geminiContents = messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.text }]
          }));

          const payload = {
            systemInstruction: { parts: [{ text: contextualPrompt }] },
            contents: geminiContents,
            generationConfig: {
              responseMimeType: 'text/plain',
              temperature: 0.5,
              maxOutputTokens: 2048
            }
          };

          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            const parts = data?.candidates?.[0]?.content?.parts || [];
            let text = null;
            for (const part of parts) {
              if (part.text && !part.thought) { text = part.text; break; }
            }
            if (!text) text = parts[0]?.text;
            if (text) {
              replyText = text;
              success = true;
              console.log(`[AI Chat] Success with ${providerKey}`);
              break;
            }
          } else {
            lastError = await response.text();
          }
        } else if (isGroq) {
          // Format for Groq
          const groqMessages = messages.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.text
          }));
          
          const payload = {
            model: 'llama-3.3-70b-versatile',
            temperature: 0.5,
            max_tokens: 2048,
            messages: [
              { role: 'system', content: contextualPrompt },
              ...groqMessages
            ]
          };

          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify(payload),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            const text = data?.choices?.[0]?.message?.content;
            if (text) {
              replyText = text;
              success = true;
              console.log(`[AI Chat] Success with ${providerKey}`);
              break;
            }
          } else {
            lastError = await response.text();
          }
        }
      } catch (err) {
        lastError = err.message;
        if (err.name === 'TimeoutError' || err.message.includes('timeout') || err.message.includes('aborted')) {
          console.warn(`[AI Chat] Timeout with ${providerKey}`);
          if (providerKey.startsWith('gemini')) break; // Stop trying more Gemini keys on network timeout
        }
      }
    }

    if (!success) {
      console.error('All AI providers failed. Last error:', lastError);
      return res.status(400).json({ 
        reply: `My AI brain is currently overloaded or timed out. Please try again in a few moments. (Error: ${lastError})` 
      });
    }

    return res.status(200).json({ reply: replyText });
  } catch (err) {
    console.error('AI Chat error:', err);
    return res.status(500).json({ error: 'Failed to process chat' });
  }
}

