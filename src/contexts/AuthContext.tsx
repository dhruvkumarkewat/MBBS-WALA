import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import supabase from '../lib/supabase';
import { apiJson } from '../lib/api';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  name?: string;
  phone?: string;
  avatar_url?: string;
  date_of_birth?: string;
  gender?: string;
  state?: string;
  district?: string;
  category?: string;
  sub_category?: string;
  domicile?: string;
  domicile_state?: string;
  exam?: string;
  neet_roll_number?: string;
  neet_rank?: number | null;
  neet_score?: number | null;
  neet_percentile?: number | null;
  pcb_percentage?: number | null;
  twelfth_percentage?: number | null;
  passing_year?: number | null;
  attempt_number?: number | null;
  preferred_states?: string[];
  preferred_course?: string;
  college_preference?: string;
  tuition_budget?: string;
  hostel_required?: boolean;
  pwd_status?: boolean;
  ews_status?: boolean;
  defence_quota?: boolean;
  freedom_fighter_quota?: boolean;
  profile_completed?: boolean;
  onboarding_done?: boolean;
  completion_percentage?: number;
  referral_code?: string;
  is_premium?: boolean;
}

export function checkProfileCompleteness(p: UserProfile | null | undefined): boolean {
  if (localStorage.getItem('onboarding_done_flag') === 'true') {
    return true; // Ultimate fallback: if we saved it in this browser, never loop back
  }
  
  if (!p) {
    console.log('[DEBUG] checkProfileCompleteness: profile is null, returning false');
    return false;
  }
  if (p.profile_completed === true || p.onboarding_done === true) {
    console.log('[DEBUG] checkProfileCompleteness: profile_completed or onboarding_done is true, returning true');
    return true;
  }
  const hasName = Boolean((p.full_name || p.name || '').trim());
  const hasPhone = Boolean((p.phone || '').trim().length >= 8);
  const hasScoreOrRank = p.neet_score != null || p.neet_rank != null;
  const hasCategory = Boolean((p.category || '').trim());
  const hasDomicile = Boolean((p.domicile_state || p.domicile || p.state || '').trim());
  const isComplete = hasName && hasPhone && hasScoreOrRank && hasCategory && hasDomicile;
  console.log(`[DEBUG] checkProfileCompleteness: checking fields... Name:${hasName}, Phone:${hasPhone}, ScoreRank:${hasScoreOrRank}, Category:${hasCategory}, Domicile:${hasDomicile} -> Result: ${isComplete}`);
  return isComplete;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: UserProfile | null;
  profileLoading: boolean;
  isProfileComplete: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
  setProfileState: (p: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  profileLoading: true,
  isProfileComplete: false,
  signOut: async () => {},
  refreshSession: async () => {},
  refreshProfile: async () => null,
  setProfileState: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const activeFetchRef = useRef<Promise<UserProfile | null> | null>(null);

  const fetchProfile = useCallback(async (currUser: User | null, skipLoadingState = false): Promise<UserProfile | null> => {
    if (!currUser) {
      setProfile(null);
      setProfileLoading(false);
      return null;
    }

    if (activeFetchRef.current) {
      return activeFetchRef.current;
    }

    // Only show loading spinner on first load, not on background token refreshes
    if (!skipLoadingState) setProfileLoading(true);

    const promise = (async () => {
      try {
        const data = await apiJson<UserProfile>('/api/profile', {}, true);
        // OVERRIDE stale backend data with user_metadata if user_metadata says it's completed
        if (currUser?.user_metadata?.profile_completed) {
          data.profile_completed = true;
          data.onboarding_done = true;
        }
        setProfile(data);
        return data;
      } catch {
        // API failed — try direct Supabase client query as fallback
        // This works even when the backend API is broken (e.g., missing service role key)
        try {
          const { data: directData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currUser.id)
            .maybeSingle();
          if (directData) {
            const meta = currUser.user_metadata || {};
            // Trust profile_completed from DB OR user_metadata (whichever is true)
            const isCompleted = Boolean(
              directData.profile_completed ||
              directData.onboarding_done ||
              meta.profile_completed ||
              meta.onboarding_done
            );
            const merged = {
              ...directData,
              profile_completed: isCompleted,
              onboarding_done: isCompleted,
            };
            setProfile(merged);
            return merged;
          }
        } catch {
          // Direct Supabase query also failed — fall through to user_metadata
        }
        // Last resort: use user_metadata from JWT
        const meta = currUser.user_metadata || {};
        const fallback: UserProfile = {
          id: currUser.id,
          email: currUser.email || '',
          full_name: meta.full_name || meta.name || '',
          phone: meta.phone || '',
          profile_completed: Boolean(meta.profile_completed),
          onboarding_done: Boolean(meta.onboarding_done),
        };
        setProfile(fallback);
        return fallback;
      } finally {
        activeFetchRef.current = null;
        setProfileLoading(false);
      }
    })();

    activeFetchRef.current = promise;
    return promise;
  }, []);

  const refreshSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    setUser(data.session?.user ?? null);
    await fetchProfile(data.session?.user ?? null);
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    return fetchProfile(user);
  }, [fetchProfile, user]);

  const setProfileState = useCallback((p: UserProfile | null) => {
    setProfile(p);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      const u = s?.user ?? null;
      setUser(u);
      setLoading(false);
      if (u) {
        fetchProfile(u);
      } else {
        setProfile(null);
        setProfileLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      const u = s?.user ?? null;
      setUser(u);
      setLoading(false);
      // Skip profile re-fetch on token refresh or user metadata update
      // USER_UPDATED fires when supabase.auth.updateUser() is called — if we re-fetch
      // at that point, the backend may return stale data and overwrite our local state.
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return;
      if (u) {
        fetchProfile(u, true); // true = skipLoadingState so the dashboard doesn't unmount
      } else {
        setProfile(null);
        setProfileLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const isProfileComplete = useMemo(() => {
    return checkProfileCompleteness(profile);
  }, [profile]);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      profile,
      profileLoading,
      isProfileComplete,
      refreshSession,
      refreshProfile,
      setProfileState,
      signOut: async () => {
        setProfile(null);
        await supabase.auth.signOut();
      },
    }),
    [user, session, loading, profile, profileLoading, isProfileComplete, refreshSession, refreshProfile, setProfileState]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
