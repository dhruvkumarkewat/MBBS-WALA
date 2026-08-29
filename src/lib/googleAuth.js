import supabase from './supabase';

/**
 * Initiates Google OAuth Sign-In directly via Supabase Auth.
 * Works seamlessly across both desktop and mobile without requiring manual popup listeners.
 */
export async function signInWithGoogle(_appName = 'MBBSWala') {
  try {
    const redirectTo = `${window.location.origin}/login`;
    // Set a flag so the Login page knows we're returning from a Google OAuth flow
    sessionStorage.setItem('google_oauth_pending', '1');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      sessionStorage.removeItem('google_oauth_pending');
      console.error('[google-auth] signInWithOAuth error:', error.message);
      // Fallback: If custom OAuth client is specified in env
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (clientId) {
        const nonce = Math.random().toString(36).substring(2);
        const state = btoa(JSON.stringify({ origin: window.location.origin }));
        const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
          redirectTo
        )}&response_type=token%20id_token&scope=openid%20email%20profile&prompt=select_account&state=${encodeURIComponent(
          state
        )}&nonce=${nonce}`;
        window.location.href = googleUrl;
        return;
      }
      alert('Google Login: ' + error.message);
      throw error;
    }
    return data;
  } catch (err) {
    console.error('[google-auth] Failed to initiate Google login:', err);
  }
}

/**
 * Parses tokens returned from OAuth provider redirects.
 */
export async function handleGoogleRedirect() {
  try {
    const hash = window.location.hash;
    if (hash && (hash.includes('access_token') || hash.includes('id_token'))) {
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (access_token) {
        await supabase.auth.setSession({
          access_token,
          refresh_token: refresh_token || access_token,
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
    // NOTE: Do NOT clear google_oauth_pending here — this function runs before React
    // mounts, so removing the flag would prevent Login.tsx from detecting the redirect.
    // The Login page clears the flag itself after routing.
  } catch (err) {
    console.error('[google-auth] Error handling redirect:', err);
  }
}
