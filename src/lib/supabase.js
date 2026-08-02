import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// --- MOCK AUTH FOR DEMO / PLACEHOLDER PROJECTS ---
if (supabaseUrl?.includes('placeholder')) {
  console.warn('Running with MOCK Supabase auth (placeholder URL detected). Demo accounts are active.');
  
  let currentSession = null;
  const listeners = new Set();
  
  try {
    const saved = localStorage.getItem('mock_sb_session');
    if (saved) currentSession = JSON.parse(saved);
  } catch (e) {}

  const notify = (event) => {
    listeners.forEach(cb => cb(event, currentSession));
  };

  supabase.auth.getSession = async () => ({ data: { session: currentSession }, error: null });
  
  supabase.auth.onAuthStateChange = (cb) => {
    listeners.add(cb);
    return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
  };

  supabase.auth.signInWithPassword = async ({ email, password }) => {
    const isStudent = email === 'demo@mbbswala.in' && password === 'password123';
    const isAdmin = email === 'admin@mbbswala.in' && password === 'Admin@123456';
    const isCounsellor = email === 'counsellor@mbbswala.in' && password === 'Counsel@123';

    if (!isStudent && !isAdmin && !isCounsellor) {
      return { data: null, error: new Error('Invalid login credentials') };
    }

    currentSession = {
      access_token: 'mock_token_' + Date.now(),
      user: {
        id: isAdmin ? 'admin-id' : isCounsellor ? 'counsellor-id' : 'student-id',
        email,
        user_metadata: { full_name: isAdmin ? 'Admin' : isCounsellor ? 'Counsellor' : 'Demo Student' },
      }
    };
    localStorage.setItem('mock_sb_session', JSON.stringify(currentSession));
    
    // Track roles for mock API interceptor
    if (isAdmin || isCounsellor) {
      localStorage.setItem('mock_is_staff', 'true');
      localStorage.setItem('mock_role', isAdmin ? 'super_admin' : 'sub_admin');
    } else {
      localStorage.removeItem('mock_is_staff');
      localStorage.removeItem('mock_role');
    }

    notify('SIGNED_IN');
    return { data: { user: currentSession.user, session: currentSession }, error: null };
  };

  supabase.auth.signUp = async ({ email, password, options }) => {
    currentSession = {
      access_token: 'mock_token_' + Date.now(),
      user: {
        id: 'new-user-id',
        email,
        user_metadata: options?.data || {},
      }
    };
    localStorage.setItem('mock_sb_session', JSON.stringify(currentSession));
    localStorage.removeItem('mock_is_staff');
    localStorage.removeItem('mock_role');
    notify('SIGNED_IN');
    return { data: { user: currentSession.user, session: currentSession }, error: null };
  };

  supabase.auth.signOut = async () => {
    currentSession = null;
    localStorage.removeItem('mock_sb_session');
    localStorage.removeItem('mock_is_staff');
    localStorage.removeItem('mock_role');
    notify('SIGNED_OUT');
    return { error: null };
  };
}

export default supabase;
