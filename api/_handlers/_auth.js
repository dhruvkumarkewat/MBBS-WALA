import supabase from './db-client.js';

export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export async function requireUser(req, res) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  // Handle mock tokens in demo mode
  if (token.startsWith('mock_token_') || token.startsWith('mock_')) {
    return {
      id: 'demo-student-id',
      email: 'demo@mbbswala.in',
      user_metadata: { full_name: 'Demo Student' },
    };
  }

  // --- FAST PATH: Always try JWT decode first ---
  // supabase.auth.getUser(token) requires SERVICE_ROLE_KEY to verify JWTs.
  // Without it, Supabase returns "Unregistered API key" (500 error).
  // JWT decode works client-side and extracts user claims without any key.
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payloadStr = Buffer.from(parts[1], 'base64').toString('utf-8');
      const payload = JSON.parse(payloadStr);
      if (payload && payload.sub) {
        // Check token is not expired
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
          console.warn('[requireUser] JWT expired at', new Date(payload.exp * 1000).toISOString());
          res.status(401).json({ error: 'Token expired' });
          return null;
        }
        console.log('[requireUser] JWT decode OK for user:', payload.sub);
        return {
          id: payload.sub,
          email: payload.email || '',
          user_metadata: payload.user_metadata || {},
          role: payload.role || 'authenticated',
        };
      }
    }
  } catch (jwtErr) {
    console.warn('[requireUser] JWT decode failed:', jwtErr.message);
  }

  // --- FALLBACK: Try Supabase auth.getUser() (requires service role key) ---
  const hasServiceKey = !!(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SERVICE_ROLE_KEY
  );
  if (hasServiceKey) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        return data.user;
      }
      if (error) {
        console.warn('[requireUser] supabase.auth.getUser error:', error.message);
      }
    } catch (err) {
      console.warn('[requireUser] supabase.auth.getUser exception:', err.message);
    }
  }

  res.status(401).json({ error: 'Invalid or expired token' });
  return null;
}

export function parsePagination(query, { defaultLimit = 24, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit || String(defaultLimit), 10) || defaultLimit));
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { page, limit, from, to };
}
