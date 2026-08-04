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

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data?.user) {
      return data.user;
    }
    if (error) {
      console.warn('supabase.auth.getUser error:', error.message);
    }
  } catch (err) {
    console.warn('supabase.auth.getUser exception:', err.message);
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
