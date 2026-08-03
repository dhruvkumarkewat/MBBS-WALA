import supabase from './supabase';

export async function getAccessToken(forceRefresh = false): Promise<string | null> {
  try {
    if (!forceRefresh) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        const exp = data.session.expires_at;
        // If token is valid for more than 60 seconds, use it
        if (!exp || exp * 1000 > Date.now() + 60000) {
          return data.session.access_token;
        }
      }
    }
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.data.session?.access_token) {
      return refreshed.data.session.access_token;
    }
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    try {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    } catch {
      return null;
    }
  }
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  auth = false
): Promise<Response> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  let token: string | null = null;
  if (auth) {
    token = await getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  // --- MOCK API FOR DEMO / PLACEHOLDER PROJECTS ---
  if (
    import.meta.env.VITE_SUPABASE_URL?.includes('placeholder') ||
    token?.startsWith('mock_token_')
  ) {
    if (path === '/api/admin-auth') {
      const isStaff = localStorage.getItem('mock_is_staff') === 'true';
      const role = localStorage.getItem('mock_role') || 'sub_admin';
      return new Response(
        JSON.stringify({
          isStaff,
          role,
          staff: { full_name: role === 'super_admin' ? 'Admin' : 'Counsellor' },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    if (path === '/api/profile') {
      if (options.method === 'PUT' || options.method === 'PATCH') {
        const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body || {};
        return new Response(JSON.stringify({ success: true, ...body, profile_completed: true, onboarding_done: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({
          id: 'demo-student-id',
          email: 'demo@mbbswala.in',
          full_name: 'Demo Student',
          name: 'Demo Student',
          phone: '9876543210',
          category: 'General',
          domicile_state: 'Madhya Pradesh',
          exam: 'NEET UG',
          preferred_course: 'MBBS',
          profile_completed: true,
          onboarding_done: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (path === '/api/notifications') {
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (path === '/api/applications') {
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (path === '/api/referrals') {
      if (options.method === 'POST') {
        return new Response(
          JSON.stringify({ message: 'Code applied successfully!', coupon_code: 'MOCK500' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({
          referral_code: 'MOCK123',
          share_url: 'https://mbbswala.com/refer?code=MOCK123',
          rewards: { referrer: 500, referee: 500 },
          stats: { total: 0, completed: 0, pending: 0, earned: 0 },
          referrals: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (path === '/api/wallet') {
      return new Response(
        JSON.stringify({
          wallet: { balance: 0, lifetime_earned: 0, lifetime_withdrawn: 0, referral_code: 'MOCK123' },
          transactions: [],
          analytics: { monthly: [], total_earned: 0, total_withdrawn: 0, available: 0 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (path === '/api/leaderboard') {
      return new Response(JSON.stringify({ leaderboard: [], you: null }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (path === '/api/badges') {
      return new Response(JSON.stringify({ badges: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (path === '/api/challenges' && options.method !== 'POST') {
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (path === '/api/coupons') {
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (path === '/api/earnings') {
      return new Response(JSON.stringify({ summary: {}, monthly: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (path === '/api/withdrawals') {
      return new Response(JSON.stringify({ withdrawals: [], wallet: { balance: 0 } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (path === '/api/choices') {
      return new Response(JSON.stringify({ choices: null }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (
      path.startsWith('/api/admin-students') ||
      path.startsWith('/api/admin-purchases') ||
      path.startsWith('/api/admin-followups') ||
      path.startsWith('/api/admin-activity') ||
      path.startsWith('/api/admin-staff')
    ) {
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  }

  let res = await fetch(path, { ...options, headers });

  // If 401 Unauthorized, proactively refresh session and retry once
  if (res.status === 401 && auth) {
    const refreshedToken = await getAccessToken(true);
    if (refreshedToken && refreshedToken !== token) {
      headers.set('Authorization', `Bearer ${refreshedToken}`);
      res = await fetch(path, { ...options, headers });
    }
  }

  return res;
}

export async function apiJson<T = unknown>(
  path: string,
  options: RequestInit = {},
  auth = false
): Promise<T> {
  const res = await apiFetch(path, options, auth);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}
