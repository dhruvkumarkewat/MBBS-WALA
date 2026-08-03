import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  if (!p) return false;
  if (p.profile_completed === true || p.onboarding_done === true) return true;
  const hasName = Boolean((p.full_name || p.name || '').trim());
  const hasPhone = Boolean((p.phone || '').trim().length >= 8);
  const hasScoreOrRank = p.neet_score != null || p.neet_rank != null;
  const hasCategory = Boolean((p.category || '').trim());
  const hasDomicile = Boolean((p.domicile_state || p.domicile || p.state || '').trim());
  return hasName && hasPhone && hasScoreOrRank && hasCategory && hasDomicile;
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

  const fetchProfile = useCallback(async (currUser: User | null, skipLoadingState = false): Promise<UserProfile | null> => {
    if (!currUser) {
      setProfile(null);
      setProfileLoading(false);
      return null;
    }
    // Only show loading spinner on first load, not on background token refreshes
    if (!skipLoadingState) setProfileLoading(true);
    try {
      const data = await apiJson<UserProfile>('/api/profile', {}, true);
      setProfile(data);
      return data;
    } catch {
      // Fallback from user metadata
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
      setProfileLoading(false);
    }
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
      // Skip profile re-fetch on token refresh (tab focus) to prevent dashboard reload
      if (event === 'TOKEN_REFRESHED') return;
      if (u) {
        fetchProfile(u);
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
