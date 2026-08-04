import supabaseGlobal from './db-client.js';
import { setCors, requireUser } from './_auth.js';
import { ensureWallet } from './wallet-helpers.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://hbzzamezfhzsdupdhcin.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

function getUserClient(token) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return supabaseGlobal;
  if (!token) return supabaseGlobal;
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

function computeProfileCompletion(p) {
  const fields = [
    'full_name',
    'phone',
    'category',
    'state',
    'domicile',
    'date_of_birth',
    'gender',
    'neet_rank',
    'neet_score',
    'pcb_percentage',
    'twelfth_percentage',
    'passing_year',
    'preferred_course',
    'college_preference',
  ];
  let filled = 0;
  for (const f of fields) {
    if (p[f] !== null && p[f] !== undefined && String(p[f]).trim() !== '') {
      filled++;
    }
  }
  return Math.round((filled / fields.length) * 100);
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const supabase = getUserClient(token);

    if (req.method === 'GET') {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('Profile fetch error, checking by email:', error.message);
        const byEmail = await supabase
          .from('profiles')
          .select('*')
          .eq('email', user.email || '')
          .maybeSingle();
        if (byEmail.data) data = byEmail.data;
      }
      
      // Ensure wallet exists & get referral code
      let wallet = null;
      try {
        wallet = await ensureWallet(user);
      } catch (wErr) {
        console.warn('Wallet error in profile GET:', wErr.message);
      }

      if (!data) {
        const seed = {
          id: user.id,
          email: user.email || '',
          full_name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            (user.email ? user.email.split('@')[0] : 'Student'),
          name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            (user.email ? user.email.split('@')[0] : 'Student'),
          phone: user.user_metadata?.phone || '',
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
          category: 'General',
          domicile: 'Madhya Pradesh',
          exam: 'NEET UG',
          role: 'student',
          is_premium: false,
          subscription_status: 'free',
          subscription_plan: 'Free Plan',
          payment_status: 'Unpaid',
          referral_code: wallet?.referral_code || '',
          profile_completed: false,
          onboarding_done: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const inserted = await supabase
          .from('profiles')
          .upsert(seed, { onConflict: 'id' })
          .select()
          .single();

        if (inserted.error) {
          console.error('Profile insert fallback error:', inserted.error);
          data = seed;
        } else {
          data = inserted.data;
        }
      }

      // Sync referral_code from wallet if missing in profile
      if (!data.referral_code && wallet?.referral_code) {
        data.referral_code = wallet.referral_code;
        await supabase
          .from('profiles')
          .update({ referral_code: wallet.referral_code })
          .eq('id', user.id);
      }

      // Attach wallet summary & saved colleges count
      const savedCount = await supabase
        .from('saved_colleges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .then((r) => r.count || 0)
        .catch(() => 0);

      const bookmarksCount = await supabase
        .from('bookmarks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .then((r) => r.count || 0)
        .catch(() => 0);

      const completion = computeProfileCompletion(data);

      return res.status(200).json({
        ...data,
        full_name: data.full_name || data.name || user.user_metadata?.full_name || '',
        name: data.name || data.full_name || '',
        email: data.email || user.email || '',
        neet_rank: data.neet_rank ?? (data.rank ? Number(data.rank) : null),
        neet_score: data.neet_score ?? (data.score ?? (data.marks ? Number(data.marks) : null)),
        wallet: wallet
          ? {
              balance: wallet.balance || 0,
              lifetime_earned: wallet.lifetime_earned || 0,
              lifetime_withdrawn: wallet.lifetime_withdrawn || 0,
              referral_code: wallet.referral_code,
            }
          : null,
        saved_colleges_count: savedCount || 0,
        bookmarks_count: bookmarksCount || 0,
        completion_percentage: completion,
        profile_completed: Boolean(data.profile_completed || data.onboarding_done || user.user_metadata?.profile_completed || user.user_metadata?.onboarding_done),
        onboarding_done: Boolean(data.profile_completed || data.onboarding_done || user.user_metadata?.profile_completed || user.user_metadata?.onboarding_done),
      });
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = req.body || {};

      const patch = {
        // Personal
        full_name: body.full_name !== undefined ? String(body.full_name).trim() : undefined,
        name: body.full_name !== undefined ? String(body.full_name).trim() : (body.name !== undefined ? String(body.name).trim() : undefined),
        phone: body.phone !== undefined ? String(body.phone).trim() : undefined,
        avatar_url: body.avatar_url !== undefined ? String(body.avatar_url).trim() : undefined,
        date_of_birth: body.date_of_birth !== undefined ? body.date_of_birth || null : undefined,
        gender: body.gender !== undefined ? String(body.gender) : undefined,
        state: body.state !== undefined ? String(body.state).trim() : undefined,
        district: body.district !== undefined ? String(body.district).trim() : undefined,
        category: body.category !== undefined ? String(body.category) : undefined,
        sub_category: body.sub_category !== undefined ? String(body.sub_category).trim() : undefined,
        domicile: body.domicile !== undefined ? String(body.domicile).trim() : undefined,
        domicile_state: body.domicile_state !== undefined ? String(body.domicile_state).trim() : (body.domicile !== undefined ? String(body.domicile).trim() : undefined),

        // Academic
        exam: body.exam !== undefined ? String(body.exam) : undefined,
        neet_roll_number: body.neet_roll_number !== undefined ? String(body.neet_roll_number).trim() : undefined,
        neet_rank: body.neet_rank != null && body.neet_rank !== '' ? Number(body.neet_rank) : (body.rank != null && body.rank !== '' ? Number(body.rank) : undefined),
        rank: body.neet_rank != null && body.neet_rank !== '' ? String(body.neet_rank) : (body.rank != null && body.rank !== '' ? String(body.rank) : undefined),
        neet_score: body.neet_score != null && body.neet_score !== '' ? Number(body.neet_score) : (body.score != null && body.score !== '' ? Number(body.score) : (body.marks != null && body.marks !== '' ? Number(body.marks) : undefined)),
        score: body.neet_score != null && body.neet_score !== '' ? Number(body.neet_score) : (body.score != null && body.score !== '' ? Number(body.score) : (body.marks != null && body.marks !== '' ? Number(body.marks) : undefined)),
        marks: body.neet_score != null && body.neet_score !== '' ? String(body.neet_score) : (body.marks != null && body.marks !== '' ? String(body.marks) : undefined),
        neet_percentile: body.neet_percentile != null && body.neet_percentile !== '' ? Number(body.neet_percentile) : (body.percentile != null && body.percentile !== '' ? Number(body.percentile) : undefined),
        percentile: body.neet_percentile != null && body.neet_percentile !== '' ? Number(body.neet_percentile) : (body.percentile != null && body.percentile !== '' ? Number(body.percentile) : undefined),
        pcb_percentage: body.pcb_percentage != null && body.pcb_percentage !== '' ? Number(body.pcb_percentage) : undefined,
        twelfth_percentage: body.twelfth_percentage != null && body.twelfth_percentage !== '' ? Number(body.twelfth_percentage) : undefined,
        passing_year: body.passing_year != null && body.passing_year !== '' ? Number(body.passing_year) : undefined,
        attempt_number: body.attempt_number != null && body.attempt_number !== '' ? Number(body.attempt_number) : undefined,
        predicted_rank_min: body.predicted_rank_min != null && body.predicted_rank_min !== '' ? Number(body.predicted_rank_min) : undefined,
        predicted_rank_max: body.predicted_rank_max != null && body.predicted_rank_max !== '' ? Number(body.predicted_rank_max) : undefined,

        // Reservation
        pwd_status: body.pwd_status !== undefined ? Boolean(body.pwd_status) : undefined,
        ews_status: body.ews_status !== undefined ? Boolean(body.ews_status) : undefined,
        defence_quota: body.defence_quota !== undefined ? Boolean(body.defence_quota) : undefined,
        freedom_fighter_quota: body.freedom_fighter_quota !== undefined ? Boolean(body.freedom_fighter_quota) : undefined,
        minority_status: body.minority_status !== undefined ? String(body.minority_status).trim() : undefined,
        other_reservations: body.other_reservations !== undefined ? String(body.other_reservations).trim() : undefined,

        // Preferences
        preferred_states: body.preferred_states !== undefined ? body.preferred_states : undefined,
        preferred_course: body.preferred_course !== undefined ? String(body.preferred_course).trim() : undefined,
        college_preference: body.college_preference !== undefined ? String(body.college_preference) : undefined,
        tuition_budget: body.tuition_budget !== undefined ? String(body.tuition_budget).trim() : undefined,
        hostel_required: body.hostel_required !== undefined ? Boolean(body.hostel_required) : undefined,
        language_preference: body.language_preference !== undefined ? String(body.language_preference).trim() : undefined,

        // Onboarding
        profile_completed: body.profile_completed !== undefined ? Boolean(body.profile_completed) : undefined,
        onboarding_done: body.onboarding_done !== undefined ? Boolean(body.onboarding_done) : undefined,

        updated_at: new Date().toISOString(),
      };

      Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

      let upsertPayload = { id: user.id, email: user.email || '', ...patch };

      let { data, error } = await supabase
        .from('profiles')
        .upsert(upsertPayload, { onConflict: 'id' })
        .select()
        .single();

      // If upsert fails due to unknown columns, strip them and retry
      let maxRetries = 10;
      while (error && error.code === 'PGRST204' && maxRetries > 0) {
        const colMatch = error.message?.match(/Could not find the '(\w+)' column/);
        if (colMatch && colMatch[1]) {
          const badCol = colMatch[1];
          console.warn('Stripping unknown column from profile update:', badCol);
          delete upsertPayload[badCol];
          delete patch[badCol];
          const retry = await supabase
            .from('profiles')
            .upsert(upsertPayload, { onConflict: 'id' })
            .select()
            .single();
          data = retry.data;
          error = retry.error;
          maxRetries--;
        } else {
          break;
        }
      }

      if (error) {
        console.error('profile PUT error:', error);
        throw error;
      }

      // Automatically sync to student_counselling table (for Admin CRM & counsellors)
      try {
        const studentRow = {
          user_id: user.id,
          full_name: data.full_name || data.name || user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'Student'),
          email: user.email || data.email || '',
          phone: data.phone || user.user_metadata?.phone || '',
          neet_rank: data.neet_rank ?? (data.rank ? Number(data.rank) : null),
          score: data.neet_score ?? (data.score ?? (data.marks ? Number(data.marks) : null)),
          state: data.domicile_state || data.state || data.domicile || '',
          category: data.category || 'General',
          exam: data.exam || 'NEET UG',
          purchased_course: data.preferred_course || 'MBBS',
          updated_at: new Date().toISOString(),
        };

        const existing = await supabase
          .from('student_counselling')
          .select('id')
          .or(`user_id.eq.${user.id},email.eq.${user.email || ''}`)
          .maybeSingle();

        if (existing?.data?.id) {
          await supabase
            .from('student_counselling')
            .update(studentRow)
            .eq('id', existing.data.id);
        } else {
          await supabase
            .from('student_counselling')
            .insert({
              ...studentRow,
              counselling_status: 'new',
              payment_status: data.payment_status || 'pending',
              created_at: new Date().toISOString(),
            });
        }
      } catch (sErr) {
        console.warn('Sync to student_counselling info:', sErr?.message);
      }

      // Automatically sync to students table (if exists)
      try {
        await supabase.from('students').upsert(
          {
            id: user.id,
            user_id: user.id,
            name: data.full_name || data.name || '',
            full_name: data.full_name || data.name || '',
            email: user.email || data.email || '',
            phone: data.phone || '',
            neet_score: data.neet_score ?? data.score,
            score: data.neet_score ?? data.score,
            neet_rank: data.neet_rank,
            category: data.category || 'General',
            domicile_state: data.domicile_state || data.domicile || 'Madhya Pradesh',
            state: data.state || '',
            preferred_course: data.preferred_course || 'MBBS',
            profile_completed: Boolean(data.profile_completed || data.onboarding_done),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      } catch (stErr) {
        /* students table fallback */
      }

      const completion = computeProfileCompletion(data || {});
      return res.status(200).json({ 
        ...data, 
        completion_percentage: completion,
        profile_completed: patch.profile_completed ?? data.profile_completed,
        onboarding_done: patch.onboarding_done ?? data.onboarding_done
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('profile API error:', err);
    res.status(500).json({ error: err.message });
  }
}
