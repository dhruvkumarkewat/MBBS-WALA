import supabase from './db-client.js';
import { setCors } from './_auth.js';
import { requireSuperAdmin, requireStaff, logActivity } from './_admin.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const ctx = await requireStaff(req, res);
      if (!ctx) return;
      const { staff } = ctx;

      if (staff.role === 'sub_admin') {
        return res.status(200).json([staff]);
      }

      const { data, error } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('role', 'sub_admin')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Enrich with live counts
      const enriched = await Promise.all(
        (data || []).map(async (s) => {
          const { data: students } = await supabase
            .from('student_counselling')
            .select('id, user_id, email, phone, counselling_status')
            .eq('assigned_to', s.user_id);
          
          const staffStudentMap = new Map();
          for (const st of students || []) {
            const key = st.user_id ? `user:${st.user_id}` : st.email ? `email:${st.email.toLowerCase().trim()}` : `id:${st.id}`;
            if (!staffStudentMap.has(key)) {
              staffStudentMap.set(key, st);
            }
          }
          const list = Array.from(staffStudentMap.values());
          const pending = list.filter((x) =>
            ['new', 'assigned', 'in_progress', 'follow_up'].includes(x.counselling_status)
          ).length;
          const completed = list.filter((x) => x.counselling_status === 'completed').length;
          const converted = list.filter((x) => x.counselling_status === 'admitted').length;

          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const { count: contactedToday } = await supabase
            .from('activity_logs')
            .select('*', { count: 'exact', head: true })
            .eq('staff_id', s.user_id)
            .eq('action', 'Contacted Student')
            .gte('created_at', todayStart.toISOString());

          const { count: pendingFollowups } = await supabase
            .from('counselling_followups')
            .select('*', { count: 'exact', head: true })
            .eq('staff_id', s.user_id)
            .eq('status', 'pending');

          return {
            ...s,
            assigned_count: list.length,
            pending_count: pending,
            completed_count: completed,
            converted_count: converted,
            contacted_today: contactedToday || 0,
            pending_followups: pendingFollowups || 0,
          };
        })
      );

      return res.status(200).json(enriched);
    }

    // Mutations — super admin only
    const ctx = await requireSuperAdmin(req, res);
    if (!ctx) return;
    const { user } = ctx;

    if (req.method === 'POST') {
      const {
        email,
        password,
        full_name,
        phone,
        employee_id,
        photo_url,
      } = req.body || {};

      if (!email || !password || !full_name) {
        return res.status(400).json({ error: 'email, password and full_name are required' });
      }

      let uid;
      const { data: created, error: cErr } = await supabase.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true,
        user_metadata: { full_name, phone: phone || '', role: 'sub_admin' },
      });
      
      if (cErr) {
        if (cErr.message && cErr.message.toLowerCase().includes('already been registered')) {
          // Find existing user in profiles
          const { data: existing } = await supabase
            .from('profiles')
            .select('id, role')
            .ilike('email', email.trim())
            .single();
            
          if (!existing) {
            throw new Error('Email exists in auth but no profile found. Cannot promote to sub_admin.');
          }
          if (existing.role === 'super_admin') {
            return res.status(403).json({ error: 'Cannot change the role of a Super Admin.' });
          }
          uid = existing.id;

          // Update existing user's password and role
          const { error: upErr } = await supabase.auth.admin.updateUserById(uid, {
            password,
            user_metadata: { full_name, phone: phone || '', role: 'sub_admin' }
          });
          if (upErr) throw upErr;
        } else {
          throw cErr;
        }
      } else {
        uid = created.user.id;
      }

      const now = new Date().toISOString();
      const empId = employee_id || `EMP-${String(Date.now()).slice(-6)}`;

      const { data: staff, error: sErr } = await supabase
        .from('staff_profiles')
        .upsert({
          user_id: uid,
          name: full_name,
          email: email.trim(),
          phone: phone || '',
          role: 'sub_admin',
          is_active: true,
          total_sessions: 0,
          successful_admissions: 0,
          created_at: now,
        }, { onConflict: 'user_id' })
        .select()
        .single();
      if (sErr) throw sErr;

      await supabase.from('profiles').upsert({
        id: uid,
        email: email.trim(),
        full_name,
        phone: phone || '',
        role: 'sub_admin',
        created_at: now,
        updated_at: now,
      });

      await logActivity(user.id, 'Created Sub Admin', 'staff', uid, { email });
      return res.status(201).json(staff);
    }

    if (req.method === 'PUT') {
      const { user_id, ...patch } = req.body || {};
      if (!user_id) return res.status(400).json({ error: 'user_id required' });

      const allowed = [
        'full_name',
        'phone',
        'photo_url',
        'employee_id',
        'is_active',
        'presence',
        'student_rating',
      ];
      const update = { last_activity: new Date().toISOString() };
      allowed.forEach((k) => {
        if (patch[k] !== undefined) update[k] = patch[k];
      });

      const { data, error } = await supabase
        .from('staff_profiles')
        .update(update)
        .eq('user_id', user_id)
        .eq('role', 'sub_admin')
        .select()
        .single();
      if (error) throw error;

      if (patch.full_name || patch.phone) {
        await supabase
          .from('profiles')
          .update({
            full_name: patch.full_name,
            phone: patch.phone,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user_id);
      }

      await logActivity(user.id, patch.is_active === false ? 'Deactivated Sub Admin' : 'Edited Sub Admin', 'staff', user_id, patch);
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { user_id } = req.body || {};
      if (!user_id) return res.status(400).json({ error: 'user_id required' });

      // Soft-delete preferred: deactivate + unassign
      await supabase
        .from('student_counselling')
        .update({ assigned_to: null, counselling_status: 'unassigned', updated_at: new Date().toISOString() })
        .eq('assigned_to', user_id);

      await supabase
        .from('staff_profiles')
        .update({ is_active: false })
        .eq('user_id', user_id);

      try {
        await supabase.auth.admin.deleteUser(user_id);
      } catch {
        /* may fail if already removed */
      }

      await logActivity(user.id, 'Deleted Sub Admin', 'staff', user_id);
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('admin-staff error', err);
    res.status(500).json({ error: err.message });
  }
}
