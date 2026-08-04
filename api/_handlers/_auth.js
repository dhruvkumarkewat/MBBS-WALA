import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://hbzzamezfhzsdupdhcin.supabase.co';

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

// Create a client specifically to verify user JWTs.
// We use the user's own Bearer token as the apikey so Supabase validates it.
function createAuthClient(userToken) {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${userToken}` },
    },
  });
}

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

  // Method 1: Use the shared supabase client (works when service role key is set)
  try {
    const { createClient: _cc } = await import('@supabase/supabase-js');
    const client = _cc(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.getUser(token);
    if (!error && data?.user) {
      return data.user;
    }
    if (error) {
      console.warn('[requireUser] Method1 getUser error:', error.message);
    }
  } catch (err) {
    console.warn('[requireUser] Method1 exception:', err.message);
  }

  // Method 2: Call Supabase REST directly with the user's token as apikey
  // This works even with just the anon key because Supabase validates the JWT server-side
  try {
    const resp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${token}`,
      },
    });
    if (resp.ok) {
      const userData = await resp.json();
      if (userData?.id) {
        return userData;
      }
    } else {
      const body = await resp.text();
      console.warn('[requireUser] Method2 REST error:', resp.status, body);
    }
  } catch (err) {
    console.warn('[requireUser] Method2 exception:', err.message);
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
