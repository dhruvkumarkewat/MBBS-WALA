import supabase from './db-client.js';
import { setCors } from './_auth.js';
import { requireStaff, logActivity, notifyAssignment, getStaffProfile } from './_admin.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const ctx = await requireStaff(req, res);
    if (!ctx) return;
    const { user, staff } = ctx;
    const isSuper = staff.role === 'super_admin';

    if (req.method === 'GET') {
      const { id, status, q, assigned_to } = req.query;
      if (id) {
        let query = supabase.from('student_counselling').select('*').eq('id', id);
        if (!isSuper) query = query.eq('assigned_to', user.id);
        const { data, error } = await query.maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Student not found' });

        const [notes, followups, docs, messages, purchases] = await Promise.all([
          supabase.from('counselling_notes').select('*').eq('student_id', id).order('id', { ascending: false }),
          supabase.from('counselling_followups').select('*').eq('student_id', id).order('due_at', { ascending: true }),
          supabase.from('student_documents').select('*').eq('student_id', id).order('id', { ascending: false }),
          supabase.from('student_messages').select('*').eq('student_id', id).order('id', { ascending: true }),
          supabase.from('purchases').select('*').eq('student_id', Number(id)).order('id', { ascending: false }),
        ]);

        await logActivity(user.id, 'Viewed Student', 'student', id);
        return res.status(200).json({
          student: data,
          notes: notes.data || [],
          followups: followups.data || [],
          documents: docs.data || [],
          messages: messages.data || [],
          purchases: purchases.data || [],
        });
      }

      let query = supabase.from('student_counselling').select('*').order('updated_at', { ascending: false });
      if (!isSuper) query = query.eq('assigned_to', user.id);
      else if (assigned_to) query = query.eq('assigned_to', assigned_to);
      if (status) query = query.eq('counselling_status', status);
      if (q) {
        query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
      }
      let { data, error } = await query;
      if (error) {
        console.warn('student_counselling query error, fallback to profiles:', error.message);
        data = [];
      }

      // Also ensure students from profiles table are visible if super_admin
      if (isSuper && !assigned_to && (!status || status === 'new' || status === 'all')) {
        try {
          const profRes = await supabase.from('profiles').select('*').order('updated_at', { ascending: false });
          if (profRes?.data?.length) {
            const existingUserIds = new Set((data || []).map((s) => s.user_id || s.email));
            for (const p of profRes.data) {
              if (p.id && !existingUserIds.has(p.id) && (!p.email || !existingUserIds.has(p.email))) {
                (data || []).push({
                  id: p.id,
                  user_id: p.id,
                  full_name: p.full_name || p.name || (p.email ? p.email.split('@')[0] : 'Student'),
                  email: p.email || '',
                  phone: p.phone || '',
                  neet_rank: p.neet_rank ?? (p.rank ? Number(p.rank) : null),
                  score: p.neet_score ?? (p.score ?? (p.marks ? Number(p.marks) : null)),
                  state: p.domicile_state || p.state || p.domicile || '',
                  category: p.category || 'General',
                  exam: p.exam || 'NEET UG',
                  purchased_course: p.preferred_course || 'MBBS',
                  counselling_status: 'new',
                  payment_status: p.payment_status || 'pending',
                  created_at: p.created_at || new Date().toISOString(),
                  updated_at: p.updated_at || new Date().toISOString(),
                });
              }
            }
          }
        } catch {
          /* fallback */
        }
      }

      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      // Super: create student or assign; Sub: notes/followups handled elsewhere
      if (!isSuper) return res.status(403).json({ error: 'Only super admin can create students' });
      const body = req.body || {};
      const now = new Date().toISOString();
      const row = {
        user_id: body.user_id || null,
        full_name: body.full_name,
        email: body.email || '',
        phone: body.phone || '',
        neet_rank: body.neet_rank != null ? Number(body.neet_rank) : null,
        score: body.score != null ? Number(body.score) : null,
        state: body.state || '',
        category: body.category || 'General',
        exam: body.exam || 'NEET UG',
        purchased_course: body.purchased_course || '',
        purchased_counselling: body.purchased_counselling || '',
        payment_status: body.payment_status || 'pending',
        payment_amount: body.payment_amount != null ? Number(body.payment_amount) : 0,
        assigned_to: body.assigned_to || null,
        counselling_status: body.assigned_to ? 'assigned' : 'new',
        created_at: now,
        updated_at: now,
      };
      if (!row.full_name) return res.status(400).json({ error: 'full_name required' });

      const { data, error } = await supabase.from('student_counselling').insert(row).select().single();
      if (error) throw error;
      await logActivity(user.id, 'Created Student', 'student', data.id, { name: data.full_name });
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      const { id } = body;
      if (!id) return res.status(400).json({ error: 'id required' });

      // Load existing
      const { data: existing, error: eErr } = await supabase
        .from('student_counselling')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (eErr) throw eErr;
      if (!existing) return res.status(404).json({ error: 'Not found' });
      if (!isSuper && existing.assigned_to !== user.id) {
        return res.status(403).json({ error: 'Not your assigned student' });
      }

      const update = { updated_at: new Date().toISOString() };

      if (isSuper) {
        [
          'full_name',
          'email',
          'phone',
          'neet_rank',
          'score',
          'state',
          'category',
          'exam',
          'purchased_course',
          'purchased_counselling',
          'payment_status',
          'payment_amount',
          'assigned_to',
          'counselling_status',
          'user_id',
        ].forEach((k) => {
          if (body[k] !== undefined) update[k] = body[k];
        });
        if (body.assigned_to !== undefined && body.assigned_to !== existing.assigned_to) {
          update.counselling_status = body.assigned_to
            ? body.counselling_status || 'assigned'
            : body.counselling_status || 'unassigned';
          await logActivity(user.id, body.assigned_to ? 'Assigned Student' : 'Unassigned Student', 'student', id, {
            to: body.assigned_to || null,
            from: existing.assigned_to || null,
          });
        }
      } else {
        // Sub admin limited fields
        if (body.counselling_status !== undefined) {
          const allowed = ['assigned', 'in_progress', 'follow_up', 'completed', 'admitted'];
          if (!allowed.includes(body.counselling_status)) {
            return res.status(400).json({ error: 'Invalid status' });
          }
          update.counselling_status = body.counselling_status;
          if (body.counselling_status === 'completed' || body.counselling_status === 'admitted') {
            await supabase
              .from('staff_profiles')
              .update({
                total_sessions: (staff.total_sessions || 0) + 1,
                successful_admissions:
                  body.counselling_status === 'admitted'
                    ? (staff.successful_admissions || 0) + 1
                    : staff.successful_admissions,
              })
              .eq('user_id', user.id);
            await logActivity(
              user.id,
              body.counselling_status === 'admitted' ? 'Closed Counselling' : 'Marked Counselling Complete',
              'student',
              id
            );
          } else {
            await logActivity(user.id, 'Changed Student Status', 'student', id, {
              status: body.counselling_status,
            });
          }
        }
        if (body.contacted) {
          update.last_contact_at = new Date().toISOString();
          await logActivity(user.id, 'Contacted Student', 'student', id);
        }
      }

      const { data, error } = await supabase
        .from('student_counselling')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // Dual notification: student + sub-admin when counsellor is assigned
      if (
        isSuper &&
        body.assigned_to &&
        body.assigned_to !== existing.assigned_to
      ) {
        const sp = await getStaffProfile(body.assigned_to);
        await notifyAssignment({
          student: data,
          staffId: body.assigned_to,
          staffName: sp?.full_name,
          packageName: data.purchased_counselling || data.purchased_course,
          assignedByName: staff.full_name || 'Super Admin',
        });
        // Keep purchases in sync
        await supabase
          .from('purchases')
          .update({ assigned_staff_id: body.assigned_to })
          .eq('student_id', Number(id))
          .eq('status', 'paid');
      }

      await supabase
        .from('staff_profiles')
        .update({
          active_student_id: String(id),
          current_activity: `Working on ${data.full_name}`,
          last_activity: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('admin-students error', err);
    res.status(500).json({ error: err.message });
  }
}
